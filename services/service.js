const EventEmitter = require('events'),
	utils = require('../utils.js'),
	uuid = require('uuid/v4'),
	TAG = '[Service]';

class Service {
	constructor (data, relay_socket, save, api_class) {
		this.id = data.id || uuid();
		this.type = data.type;
		this.save = save;
		this._events = new EventEmitter();

		this.setSettings(data.settings || {});

		// On state change, send updated state to state listeners.
		this.unproxied_state = {...data.state};
		this.state = utils.onChange(this.unproxied_state, () => this._events.emit('state-changed', {state: {...this.unproxied_state}}));

		// Set up the Relay API.
		if (api_class) {
			const api = new api_class(relay_socket, this, this.type);

			this._relayEmit = api.emit;
		}
	}

	on () {
		return this._events.on.apply(this._events, arguments);
	}

	relayEmit (event, data, callback) {
		if (!this._relayEmit) {
			console.error(TAG, this.id, 'Tried to emit event ' + event + ' to relay, but this service has no relay API.');
			return;
		}

		this._relayEmit(event, data, callback);
	}

	setSetting (property, new_value) {
		return new Promise((resolve, reject) => {
			const errors = this._getValidationErrors({[property]: new_value}, true);

			if (errors) {
				console.error(TAG, this.id, 'Could not save new settings. Validation errors:', errors);
				reject(errors);

				return;
			}

			this.settings = {
				...settings,
				[property]: new_value
			};

			console.log(TAG, this.id, 'Saving new settings');

			resolve({...this.settings});
		});
	}

	saveSetting (property, new_value) {
		return this.setSettings(property, new_value).then(this.save);
	}

	setSettings (new_settings) {
		return new Promise((resolve, reject) => {
			const definitions = this.constructor.settings_definitions,
				settings = {};

			// Pick only the properties that exist in the settings definitions.
			Object.keys(new_settings).forEach((property) => {
				if (definitions.get(property)) {
					settings[property] = new_settings[property];
				}
			});

			const errors = this._getValidationErrors(settings);

			if (errors) {
				console.error(TAG, this.id, 'Could not save new settings. Validation errors:', errors);
				reject(errors);

				return;
			}

			this.settings = settings;

			console.log(TAG, this.id, 'Saving new settings');

			resolve({...settings});
		});
	}

	saveSettings (new_settings) {
		return this.setSettings(new_settings).then(this.save);
	}

	_getValidationErrors (settings, skip_missing_properties) {
		const errors = {};

		this.constructor.settings_definitions.forEach((definition, property) => {
			if (!settings.hasOwnProperty(property) && skip_missing_properties) {
				return;
			}

			const validations = {...definition.validation};

			// Don't validate the property if it has no value and it's not required.
			if ((typeof settings[property] === 'undefined' || settings[property] === null) && !validations.is_required) {
				return;
			}

			// Add a validation that verifies that the value is the correct data type.
			validations[definition.type] = this._getPropertyTypeValidationValue(definition);

			const rule_names = Object.keys(validations);

			// Make sure the property data type validation is performed before all others.
			rule_names.sort((a, b) => a === definition.type ? -1 : 1);

			// Run validation rules for the property.
			rule_names.forEach((rule) => {
				const rule_value = validations[rule],
					validator = utils.validators[rule](rule_value, definition),
					error = validator(settings[property], definition.label || property);

				if (error) {
					errors[property] = errors[property] || error; // If there's already an error for this property, keep it.
				}
			});
		});

		return Object.keys(errors).length ? errors : false;
	}

	_getPropertyTypeValidationValue (definition) {
		if (definition.type === 'one-of' && Array.isArray(definition.value_options)) {
			return definition.value_options.map((option) => option.value);
		}
	}

	serialize () {
		return {
			id: this.id,
			type: this.type,
			settings: this.settings
		};
	}

	dbSerialize () {
		return this.serialize();
	}

	relaySerialize () {
		return {
			...this.serialize(),
			state: this.unproxied_state,
			settings_definitions: Array.from(this.constructor.settings_definitions.entries())
		};
	}
}

Service.settings_definitions = new Map();

module.exports = Service;

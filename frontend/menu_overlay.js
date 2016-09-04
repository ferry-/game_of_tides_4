// Copyright 2016 duncan law (mrdunk@gmail.com)

/*global store*/
/*global worker*/
/*global location*/

var Options = function() {
  var SaveData = function(data) {
    // TODO: We don't need to save the whole structure, only user modifiable values.
    console.log('saving: ', data);
    store.set('options', data);
  };

  this.SelectString = function(context, data) {
    var return_val = document.createElement('input');

    return_val.setAttribute('value', context.value);

    return_val.addEventListener('change', function() {
      context.value = this.value;
      SaveData(data);
    });

    return return_val;
  };

  this.SelectNumber = function(context, data) {
    var return_val = document.createElement('input');

    return_val.setAttribute('type', 'number');
    return_val.setAttribute('min', 1);
    return_val.setAttribute('max', 120);
    return_val.setAttribute('value', context.value);

    return_val.addEventListener('change', function() {
      context.value = this.value;
      SaveData(data);
    });

    return return_val;
  };

  this.SelectBoolean = function(context, data) {
    var return_val = document.createElement('input');

    return_val.setAttribute('type', 'checkbox');
    return_val.checked = context.value;

    return_val.addEventListener('change', function() {
      context.value = this.checked;
      SaveData(data);
    });

    return return_val;
  };

  this.Execute = function(context, data) {
    var return_val = document.createElement('button');
    return_val.innerHTML = 'Send';
    return_val.addEventListener('click', function(){context.value(data);});
    return return_val;
  };

  var DefaultSettings = function(data) {
    console.log('DefaultSettings..');
    //store.remove('data')
    store.clear();
    console.log('done.');
    console.log(store.get('data'));
    location.reload();
  };

  this.data = {
    general: {
      description: 'General settings',
      settings: {
        default_settings: {
          description: 'Reset everything to default values',
          type: this.Execute,
          value: DefaultSettings
        }
      }
    },
    game_loop: {
      description: 'game_loop',
      settings: {
        fps: {
          description: 'FPS',
          type: this.SelectNumber,
          value: 10
        },
        log_fps: {
          description: 'Log FPS',
          type: this.SelectBoolean,
          value: false
        }
      }
    },
    camera: {
      description: 'camera',
      settings: {}
    },
  };

  this.RegisterClient = function(client){
    console.log("Options.RegisterClient(", client.menu_data.name, ")");
    this.data[client.menu_data.name] = client.menu_data.content;
    this.PopulateMenu();
  };

  this.openNav = function() {
    document.getElementById('nav_menu').style.height = '100%';
  };

  this.closeNav = function() {
    document.getElementById('nav_menu').style.height = '0%';
  };

  this.PopulateMenu = function() {
    this.InitialiseData();
    var content = document.createElement('ul');
    document.getElementsByClassName('overlay-content')[0].innerHTML = "";
    document.getElementsByClassName('overlay-content')[0].appendChild(content);

    for (var section in this.data) {
      var section_content = document.createElement('li');
      content.appendChild(section_content);

      var section_description = document.createElement('div');
      section_content.appendChild(section_description);
      section_description.innerHTML = this.data[section].description;

      var section_list = document.createElement('ul');
      section_content.appendChild(section_list);

      for (var setting in this.data[section].settings) {
        var data = this.data[section].settings[setting];
        if (true) {
          var setting_content = document.createElement('li');
          section_list.appendChild(setting_content);

          var setting_description = document.createElement('div');
          setting_content.appendChild(setting_description);
          setting_description.innerHTML = data.description;
          setting_description.appendChild(data.type(data, this.data));
        }
      }
    }
  };

  var MergeValues = function(source, destination) {
    if (typeof source === 'object') {
      for (var property in source) {
        console.log(property, source[property]);
        if (property === 'value' && typeof source[property] !== 'object') {
          destination[property] = source[property];
          return;
        }
        if (property !== 'description' && property !== 'type' &&
            property !== 'value' && source && destination)
        {
          MergeValues(source[property], destination[property]);
        }
      }
    }
  };

  this.InitialiseData = function(){
    var data_saved;
    if (store.enabled) {
      data_saved = store.get('options');
    }
    if (typeof data_saved === 'undefined') {
      console.log('No saved_data found. using default.');
    } else {
      console.log('Restoring saved_data.');
      MergeValues(data_saved, this.data);
    }
    console.log(data_saved);
    console.log(this.data);
  };

  //store.clear();
  this.PopulateMenu();
};

const controlInitialiser = (controls, controllersStateFromPermalink) => {
  let controlName;
  let controlOptions;
  controls.forEach((control) => {
    controlName = control.name;
    controlOptions = control.options || {};
    controlOptions.state = controllersStateFromPermalink[controlName] || [];
    if (Object.prototype.hasOwnProperty.call(origo.controls, controlName)) {
      if (controlOptions) {
        origo.controls[controlName].init(controlOptions);
      } else {
        origo.controls[controlName].init();
      }
    }
  });
};

export default controlInitialiser;

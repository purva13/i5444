const FIELD_INFOS = {
    id: {
        friendlyName: 'Sensor Type ID',
        isSensorType: true,
        isSearch: true,
        regex: /[a-zA-Z0-9_\\-]+/,
        error: 'Id field can only contain alphanumerics, - or _',
    },
    modelNumber: {
        friendlyName: 'Model Number',
        isSensorType: true,
        isSearch: true,
        regex:  /[a-zA-Z'\s\\-]+/,
        error: "Model Number field can only contain alphabetics, -, ' or space",
    },
    manufacturer: {
        friendlyName: 'Manufacturer',
        isSensorType: true,
        isSearch: true,
        regex: /[a-zA-Z'\s\\-]+/,
        error: "Manufacturer field can only contain alphabetics, -, ' or space",
    },
    quantity: {
        friendlyName: 'Quantity',
        isSensorType: true,
        isSearch: true,
        isSelect: true,
    },
};

function fieldInfos(fields, overrides={}) {
    const infos = {};
    fields.forEach((f) => {
      const v = Object.assign({}, FIELD_INFOS[f] || {});
      infos[f] = Object.assign(v, overrides[f] || {});
    });
    Object.keys(overrides).forEach((f) => {
      infos[f] = infos[f] || overrides[f];
    });
    return infos;
  }
  
  module.exports = {
    FIELD_INFOS,
    fieldInfos,
  };
  
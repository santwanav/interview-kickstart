module.exports.strToDate = function strToDate(d) {
    // sample: ‘2020-06-05T13:00:00’
    d = d.replace(/T|-|:/g, '');
    let num = parseInt(d)/10000; // discard minutes and seconds
    return num;
};

module.exports.dateToStr = function dateToStr(d) {
    let tm = d % 100;
    let dt = ((d - d%100)/100);
    dt = "" + dt;
    let day = dt.substring(6, 8);
    let mm = dt.substring(4, 6);
    let yyyy = dt.substring(0, 4);
    return `${yyyy}-${mm}-${day}T${tm}:00:00`;
};


module.exports.slotCmp = function(a, b) {
    return a.startTime > b.startTime ? 1 : -1;
};

module.exports.currTime = function() {
    const d = new Date();
    const yyyy = d.getFullYear();
    let mm = d.getMonth() + 1;
    if (mm < 10) mm = "0" + mm;
    let dd = d.getDate();
    if (dd < 10) dd = "0" + dd;
    const hh = d.getHours();
    const currTime = module.exports.strToDate(`${yyyy}-${mm}-${dd}T${hh}:00:00`);
    return currTime;
};

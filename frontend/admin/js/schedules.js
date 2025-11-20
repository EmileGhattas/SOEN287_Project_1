function loadSchedules() {

    
    return JSON.parse(localStorage.getItem("schedules")) || {};


}

function saveSchedules(data) {



    localStorage.setItem("schedules", JSON.stringify(data));

}

const resourceSelect = document.getElementById("resourceSelect");
const openTime = document.getElementById("openTime");
const closeTime = document.getElementById("closeTime");
const exceptionDate = document.getElementById("exceptionDate");
const exceptionOpen = document.getElementById("exceptionOpen");
const exceptionClose = document.getElementById("exceptionClose");
const blackoutDate = document.getElementById("blackoutDate");
const exceptionList = document.getElementById("exceptionList");
const blackoutList = document.getElementById("blackoutList");

const saveHoursBtn = document.getElementById("saveHoursBtn");
const addExceptionBtn = document.getElementById("addExceptionBtn");
const addBlackoutBtn = document.getElementById("addBlackoutBtn");

let schedules = loadSchedules();




resourceSelect.addEventListener("change", () => {
    const res = resourceSelect.value;

    if (!res) return;

    const data = schedules[res] || {
        hours: {},
        exceptions: [],
        blackout: []
    };

    
    openTime.value = data.hours.open || "";
    closeTime.value = data.hours.close || "";



    renderExceptions(data.exceptions);

    
    renderBlackouts(data.blackout);
});




saveHoursBtn.addEventListener("click", () => {
    const res = resourceSelect.value;
    if (!res) return alert("Choose a resource.");

    if (!openTime.value || !closeTime.value)
        return alert("Please enter valid times.");

    schedules[res] = schedules[res] || {};
    schedules[res].hours = {
        open: openTime.value,
        close: closeTime.value
    };

    saveSchedules(schedules);
    alert("Working hours saved!");
});




addExceptionBtn.addEventListener("click", () => {
    const res = resourceSelect.value;
    if (!res) return alert("Choose a resource.");

    if (!exceptionDate.value || !exceptionOpen.value || !exceptionClose.value)
        return alert("Fill all fields.");

    schedules[res] = schedules[res] || {};
    schedules[res].exceptions = schedules[res].exceptions || [];

    schedules[res].exceptions.push({
        date: exceptionDate.value,
        open: exceptionOpen.value,
        close: exceptionClose.value
    });

    saveSchedules(schedules);
    renderExceptions(schedules[res].exceptions);
});

function renderExceptions(list) {
    exceptionList.innerHTML = "";
    list.forEach((ex, i) => {
        const li = document.createElement("li");
        li.innerHTML = `
            ${ex.date}: ${ex.open} - ${ex.close}


            <button onclick="deleteException(${i})">X</button>
        `;
        exceptionList.appendChild(li);
    });
}

window.deleteException = function (i) {
    const res = resourceSelect.value;
    schedules[res].exceptions.splice(i, 1);
    saveSchedules(schedules);
    renderExceptions(schedules[res].exceptions);
};



addBlackoutBtn.addEventListener("click", () => {
    const res = resourceSelect.value;
    if (!res) return alert("Choose a resource.");
    if (!blackoutDate.value) return alert("Pick a date.");

    schedules[res] = schedules[res] || {};
    schedules[res].blackout = schedules[res].blackout || [];

    schedules[res].blackout.push(blackoutDate.value);

    saveSchedules(schedules);
    renderBlackouts(schedules[res].blackout);
});

function renderBlackouts(list) {
    blackoutList.innerHTML = "";
    list.forEach((date, i) => {
        const li = document.createElement("li");
        li.innerHTML = `
            ${date}


            <button onclick="deleteBlackout(${i})">X</button>

            
        `;
        blackoutList.appendChild(li);
    });
}

window.deleteBlackout = function (i) {

    const res = resourceSelect.value;
    schedules[res].blackout.splice(i, 1);
    saveSchedules(schedules);
    renderBlackouts(schedules[res].blackout);
};

function loadResources() {
    return JSON.parse(localStorage.getItem("resources")) || [];
}

function saveResources(resources) {
    localStorage.setItem("resources", JSON.stringify(resources));
}


const addResourceBtn = document.getElementById("addResourceBtn");
const resourcePanel = document.getElementById("resourcePanel");
const closeResourcePanel = document.getElementById("closeResourcePanel");
const saveResourceBtn = document.getElementById("saveResourceBtn");
const resourceList = document.getElementById("resourceList");

const panelTitle = document.getElementById("panelTitle");
const resName = document.getElementById("resName");
const resDescription = document.getElementById("resDescription");
const resLocation = document.getElementById("resLocation");
const resCapacity = document.getElementById("resCapacity");
const resType = document.getElementById("resType");
const resImage = document.getElementById("resImage");


let editingIndex = null;




function openPanel(index = null) {
    editingIndex = index;

    if (index === null) {
        


        panelTitle.textContent = "Add Resource";
        saveResourceBtn.textContent = "Add";


        resName.value = "";
        resDescription.value = "";
        resLocation.value = "";
        resCapacity.value = "";
        resType.value = "room";
        resImage.value = "";

    } 
    
    else {
        
        panelTitle.textContent = "Edit Resource";
        saveResourceBtn.textContent = "Update";

        const r = loadResources()[index];

        resName.value = r.name;
        resDescription.value = r.description;
        resLocation.value = r.location;
        resCapacity.value = r.capacity;
        resType.value = r.type;
        resImage.value = r.image;
    }

    resourcePanel.style.display = "flex"; 
}

function closePanel() {
    resourcePanel.style.display = "none";
}




function renderResources() {
    const resources = loadResources();
    resourceList.innerHTML = ""; 



    if (resources.length === 0) {
        resourceList.innerHTML = `
            <tr><td colspan="5" style="text-align:center; padding:20px; color:#666;">
                No resources added yet.
            </td></tr>`;


        return;
    }

    resources.forEach((r, i) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${r.name}</td>
            <td>${r.location}</td>
            <td>${r.capacity}</td>
            <td>${r.type}</td>
            <td>
                <button class="btn edit" onclick="editResource(${i})">Edit</button>
                <button class="btn delete" onclick="deleteResource(${i})">Delete</button>

            </td>
        `;

        resourceList.appendChild(row);
    });
}




saveResourceBtn.addEventListener("click", () => {
    const resources = loadResources();

    const newResource = {
        name: resName.value.trim(),
        description: resDescription.value.trim(),
        location: resLocation.value.trim(),
        capacity: resCapacity.value.trim(),
        type: resType.value,
        image: resImage.value.trim()
    };



    if (!newResource.name) {
        alert("Resource must have a name.");
        return;
    }

    if (editingIndex === null) {
    


        resources.push(newResource);
    } else {
    

        resources[editingIndex] = newResource;
    }

    saveResources(resources);
    renderResources();
    closePanel();
});



function editResource(index) {
    openPanel(index);
}




function deleteResource(index) {

    const resources = loadResources();
    resources.splice(index, 1);
    saveResources(resources);
    renderResources();
}


addResourceBtn.addEventListener("click", () => openPanel(null));
closeResourcePanel.addEventListener("click", closePanel);

renderResources();

window.editResource = editResource;
window.deleteResource = deleteResource;

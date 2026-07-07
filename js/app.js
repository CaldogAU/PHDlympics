function renderModuleList() {
  const moduleList = document.getElementById("moduleList");

  moduleList.innerHTML = "";

  PHDTournament.modules.forEach(moduleName => {
    const item = document.createElement("li");
    item.textContent = moduleName;
    moduleList.appendChild(item);
  });
}

function bindAppEvents() {
  document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });
}

function initApp() {
  renderModuleList();
  bindAppEvents();
  setSaveStatus("Loaded");
}

initApp();

PHDTournament.modules.push("app");
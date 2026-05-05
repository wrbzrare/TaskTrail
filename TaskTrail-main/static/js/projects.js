document.addEventListener("DOMContentLoaded", () => {
	fetch("/api/user-role")
    .then(res => res.json())
    .then(data => {
        console.log("User role:", data); // <-- проверка
        if (data.success && (data.role === "admin" || data.role === "moderator")) {
            const btn = document.getElementById("create-project-btn");
            btn.style.display = "inline-flex";
            btn.addEventListener("click", () => {
                window.location.href = "/projects/create";  
            });
        }
    });

    fetch("/api/user-projects")
        .then(res => res.json())
        .then(data => {
            if (!data.success) return;

            const container = document.getElementById("projects-container");
            container.innerHTML = ""; 

            const order = [
                "active",
                "planned",
                "paused",
                "cancelled", 
                "completed"
            ];

            const statusNames = {
                active: "Активные",
                planned: "Запланированные",
                paused: "Замороженные",
                completed: "Выполненные",
                cancelled: "Отменённые",
                archived: "Архив"
            };

            for (const status of order) {
                const list = data.projects[status];
                if (!list || list.length === 0) continue;

                const section = document.createElement("section");
                section.classList.add("project-category");

                section.innerHTML = `
                    <div class="category-header">
                        <h2>${statusNames[status]}</h2>
                        <span class="project-count">${list.length} проекта(ов)</span>
                    </div>
                    <div class="projects-grid">
                        ${list.map(p => `
                            <div class="project-card" onclick="window.location='/projects/${p.id}'">
                                <div class="project-cover" 
                                     style="background-image: url('${p.cover}'); background-size: cover;">
                                </div>
                                <div class="project-info">
                                    <h3>${p.name}</h3>
                                    <span class="project-status status-${status}">
                                        ${statusNames[status]}
                                    </span>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                `;

                container.appendChild(section);
            }
        });
});

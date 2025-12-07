document.addEventListener("DOMContentLoaded", async () => {

    await loadTasks();

    // ---------- Загрузка всех задач пользователя ----------
    async function loadTasks() {
        try {
            const res = await fetch("/api/tasks/all");
            const data = await res.json();

            if (!data.success) {
                console.error("Ошибка загрузки всех задач");
                return;
            }

            renderTasks(data.tasks);
        } catch (err) {
            console.error("Ошибка запроса:", err);
        }
    }

    // ---------- Рендеринг задач ----------
    function renderTasks(grouped) {
        const categories = {};

        document.querySelectorAll(".tasks-category").forEach(section => {
            const status = section.dataset.status;
            const list = section.querySelector(".tasks-list");
            categories[status] = list;
            list.innerHTML = "";
        });

        for (const status in grouped) {
            if (!categories[status]) continue;

            const tasks = grouped[status];
            const counter = document.querySelector(`[data-status="${status}"] .tasks-count`);
            if (counter) counter.textContent = `${tasks.length} задач`;

            tasks.forEach(task => {
                const card = buildTaskCard(task);
                categories[status].appendChild(card);
            });
        }
    }

    // ---------- Карточка задачи ----------
    function buildTaskCard(task) {
        const card = document.createElement("div");

        const isCompleted = task.user_completed || task.status === "completed";

        card.className = "task-card" + (isCompleted ? " completed" : "");

        card.innerHTML = `
            <div class="task-main">
                <div class="task-checkbox">
                    <button class="complete-btn ${isCompleted ? "completed" : ""}" data-id="${task.id}">
                        <i class="${isCompleted ? "fas fa-check-circle" : "far fa-circle"}"></i>
                    </button>
                </div>

                <div class="task-content">
                    <h3>${task.name}</h3>
                    <p>${task.description || ""}</p>
                    <div class="task-project">
                        <i class="fas fa-project-diagram"></i>
                        <a href="/projects/${task.project_id}">${task.project_name}</a>
                    </div>
                </div>
            </div>

            <div class="task-timeline">
                <div class="time-item">
                    <i class="fas fa-play-circle"></i> <span>${task.start_at || ""}</span>
                </div>
                <div class="time-item">
                    <i class="fas fa-hourglass-end"></i> <span>${task.end_at || ""}</span>
                </div>
            </div>
        `;

        const button = card.querySelector(".complete-btn");
        if (!isCompleted) {
            button.addEventListener("click", async () => {
                await markCompleted(task.id, card, button);
            });
        }

        return card;
    }

    // ---------- Отметка задачи ----------
    async function markCompleted(id, card, button) {
        try {
            const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
            const data = await res.json();

            if (data.success) {
                button.classList.add("completed");
                button.querySelector("i").className = "fas fa-check-circle";
                card.classList.add("completed");
                showNotification("Задача отмечена!");
            }
        } catch (err) {
            console.error("Ошибка:", err);
        }
    }

    // ---------- Уведомления ----------
    function showNotification(message) {
        const n = document.createElement("div");
        n.className = "notification";
        n.textContent = message;
        Object.assign(n.style, {
            position: "fixed",
            top: "20px", right: "20px",
            background: "#06d6a0", color: "white",
            padding: "15px 20px",
            borderRadius: "8px",
            boxShadow: "0 4px 15px rgba(0,0,0,.2)",
            zIndex: 1000
        });
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 2500);
    }
});

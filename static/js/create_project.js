document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("create-project-form");
    const message = document.getElementById("message");
    const coverInput = document.getElementById("cover");
    const coverImg = document.getElementById("cover-img");
    const removeCoverBtn = document.getElementById("remove-cover-btn");
    const submitBtn = document.getElementById("submit-btn");

    let coverRemoved = false;

    coverInput.addEventListener("change", () => {
        const file = coverInput.files[0];
        if (!file) {
            coverImg.src = coverImg.dataset.default || coverImg.src;
            removeCoverBtn.style.display = "none";
            return;
        }

        if (!file.type.startsWith("image/")) {
            showMessage("Выберите изображение (png/jpg).");
            coverInput.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            coverImg.src = e.target.result;
            removeCoverBtn.style.display = "inline-block";
        };
        reader.readAsDataURL(file);
        coverRemoved = false;
    });

    removeCoverBtn.addEventListener("click", () => {
        coverInput.value = "";
        coverImg.src = "{{ url_for('static', filename='img/default_project.jpg') }}".replace(location.origin, "");
        removeCoverBtn.style.display = "none";
        coverRemoved = true;
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearMessage();

        const name = form.name.value.trim();
        const description = form.description.value.trim();
        const status = form.status.value;

        if (!name) return showMessage("Введите название проекта.");
        if (!description) return showMessage("Введите описание проекта.");
        if (!status) return showMessage("Выберите статус проекта.");

        submitBtn.disabled = true;
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Сохранение...`;

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("description", description);
            formData.append("status", status);

            if (coverInput.files && coverInput.files[0]) {
                formData.append("cover", coverInput.files[0]);
            }

            const res = await fetch("/api/projects/create", {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (res.ok && data.success) {
                window.location.href = "/projects";
            } else {
                showMessage(data.error || `Ошибка: ${res.status}`);
            }
        } catch (err) {
            console.error(err);
            showMessage("Ошибка при отправке запроса.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHtml;
        }
    });

    function showMessage(text) {
        message.textContent = text;
    }
    function clearMessage() {
        message.textContent = "";
    }
});
(() => {
    const resetMs = 1600;

    document.querySelectorAll(".copy[data-copy]").forEach((btn) => {
        const idle = btn.textContent.trim();

        btn.addEventListener("click", async () => {
            const src = document.getElementById(btn.getAttribute("data-copy"));
            if (!src) {
                return;
            }

            const text = src.textContent.trim();

            try {
                await navigator.clipboard.writeText(text);
            } catch {
                const ta = document.createElement("textarea");
                ta.value = text;
                ta.setAttribute("readonly", "");
                ta.style.position = "fixed";
                ta.style.left = "-9999px";
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                ta.remove();
            }

            btn.textContent = btn.getAttribute("data-copied") || idle;
            btn.classList.add("is-copied");
            window.setTimeout(() => {
                btn.textContent = idle;
                btn.classList.remove("is-copied");
            }, resetMs);
        });
    });
})();

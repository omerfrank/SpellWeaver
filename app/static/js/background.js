        // Character count functionality
        const textareas = [
            { id: 'charBackground', countId: 'bgCount' },
            { id: 'npcs', countId: 'npcCount' },
            { id: 'plotProgress', countId: 'plotCount' },
            { id: 'clues', countId: 'clueCount' },
            { id: 'sessionNotes', countId: 'sessionCount' },
            { id: 'locations', countId: 'locCount' },
            { id: 'goals', countId:
                 'goalCount' },
            { id: 'additionalNotes', countId: 'addCount' }
        ];

        textareas.forEach(textarea => {
            const element = document.getElementById(textarea.id);
            const counter = document.getElementById(textarea.countId);
            
            element.addEventListener('input', () => {
                counter.textContent = `${element.value.length} characters`;
            });

            // Load saved content
            const saved = localStorage.getItem(textarea.id);
            if (saved) {
                element.value = saved;
                counter.textContent = `${saved.length} characters`;
            }
        });

        function saveAllNotes() {
            textareas.forEach(textarea => {
                const element = document.getElementById(textarea.id);
                localStorage.setItem(textarea.id, element.value);
            });

            // Visual feedback
            const btn = event.target.closest('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-check-circle"></i> Saved!';
            btn.style.backgroundColor = '#4ade80';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.backgroundColor = '#ff80ed';
            }, 2000);
        }
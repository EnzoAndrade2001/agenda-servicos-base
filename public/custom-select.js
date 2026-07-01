(function () {
    function selectedText(select) {
        var option = select.options[select.selectedIndex];
        return option ? option.textContent : 'Selecione';
    }

    function closeAll(except) {
        document.querySelectorAll('.custom-select.open').forEach(function (node) {
            if (node !== except) node.classList.remove('open');
        });
    }

    function syncState(select, root, button) {
        button.textContent = selectedText(select);
        root.classList.toggle('disabled', select.disabled);
        root.classList.toggle('invalid', select.classList.contains('invalid'));
        button.disabled = select.disabled;
        button.setAttribute('aria-expanded', root.classList.contains('open') ? 'true' : 'false');
    }

    function renderOptions(select, root, button, list) {
        list.replaceChildren();
        Array.from(select.options).forEach(function (option) {
            var item = document.createElement('button');
            item.type = 'button';
            item.className = 'custom-select-option';
            item.textContent = option.textContent;
            item.disabled = option.disabled;
            item.dataset.value = option.value;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', String(option.selected));
            if (option.selected) item.classList.add('selected');
            item.addEventListener('click', function () {
                select.value = option.value;
                select.dispatchEvent(new Event('input', { bubbles: true }));
                select.dispatchEvent(new Event('change', { bubbles: true }));
                root.classList.remove('open');
                syncState(select, root, button);
            });
            list.appendChild(item);
        });
        syncState(select, root, button);
    }

    function enhanceSelect(select) {
        if (select.dataset.customSelect === 'ready') return;
        select.dataset.customSelect = 'ready';
        select.classList.add('native-select-hidden');

        var root = document.createElement('div');
        root.className = 'custom-select';

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'custom-select-button';
        button.setAttribute('aria-haspopup', 'listbox');
        button.setAttribute('aria-expanded', 'false');

        var list = document.createElement('div');
        list.className = 'custom-select-list';
        list.setAttribute('role', 'listbox');

        root.append(button, list);
        select.insertAdjacentElement('afterend', root);

        button.addEventListener('click', function () {
            if (select.disabled) return;
            var willOpen = !root.classList.contains('open');
            closeAll(root);
            root.classList.toggle('open', willOpen);
            syncState(select, root, button);
        });

        select.addEventListener('change', function () {
            renderOptions(select, root, button, list);
        });

        new MutationObserver(function () {
            renderOptions(select, root, button, list);
        }).observe(select, {
            attributes: true,
            attributeFilter: ['disabled', 'class'],
            childList: true,
            subtree: true
        });

        renderOptions(select, root, button, list);
    }

    function enhanceAll() {
        document.querySelectorAll('select').forEach(enhanceSelect);
    }

    document.addEventListener('click', function (event) {
        if (!event.target.closest('.custom-select')) closeAll();
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeAll();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enhanceAll);
    } else {
        enhanceAll();
    }
})();

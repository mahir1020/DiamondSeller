console.log('diamonds.js loaded and running');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing diamond comparison...');
    
    const diamondGrid = document.querySelector('.diamond-grid');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const filterToggle = document.getElementById('filterToggle');
    const filterSection = document.getElementById('filterSection');
    const comparePanel = document.getElementById('comparePanel');
    const closeCompare = document.getElementById('closeCompare');
    const clearAllCompare = document.getElementById('clearAllCompare');
    const comparisonTable = document.getElementById('comparisonTable');
    const compareCount = document.querySelector('.compare-count');
    
    // Debug check for elements
    console.log('Compare Panel:', comparePanel);
    console.log('Comparison Table:', comparisonTable);
    console.log('Compare Count:', compareCount);

    const maxCompare = 6;
    let selectedDiamonds = new Set();
    let selectedDiamondsList = [];

    // --- LocalStorage Persistence ---
    function saveCompareToStorage() {
        localStorage.setItem('compareDiamonds', JSON.stringify(Array.from(selectedDiamondsList)));
    }
    function loadCompareFromStorage() {
        const data = localStorage.getItem('compareDiamonds');
        if (data) {
            try {
                const arr = JSON.parse(data);
                selectedDiamondsList = arr;
                selectedDiamonds = new Set(arr.map(d => d.id.toString()));
            } catch (e) {
                selectedDiamondsList = [];
                selectedDiamonds = new Set();
            }
        }
    }

    // Show loading indicator
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }

    // Ensure compare panel is hidden initially
    if (comparePanel) {
        comparePanel.style.display = 'none';
    }

    // Handle filter toggle for mobile
    if (filterToggle && filterSection) {
        filterToggle.addEventListener('click', () => {
            filterSection.classList.toggle('active');
            filterToggle.classList.toggle('active');
        });
    }

    function updateComparisonTable() {
        console.log('Updating comparison table with diamonds:', selectedDiamondsList);
        
        if (!comparisonTable) {
            console.error('Comparison table element not found!');
            return;
        }

        const headerRow = comparisonTable.querySelector('thead tr');
        if (!headerRow) {
            console.error('Header row not found in comparison table!');
            return;
        }

        // Update table headers
        headerRow.innerHTML = '<th>Properties</th>';
        selectedDiamondsList.forEach(diamond => {
            console.log('Adding diamond to comparison:', diamond);
            headerRow.innerHTML += `
                <th>
                    <div class="diamond-header">
                        <img src="${diamond.image || '/static/images/default_diamond.png'}" alt="${diamond.shape}" width="50">
                        <button class="remove-from-compare" data-id="${diamond.id}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </th>
            `;
        });

        // Update table rows
        const rows = comparisonTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const property = row.className.replace('-row', '');
            const firstCell = row.cells[0].outerHTML;
            row.innerHTML = firstCell;
            
            selectedDiamondsList.forEach(diamond => {
                row.innerHTML += `<td>${diamond[property] || 'N/A'}</td>`;
            });
        });

        if (compareCount) {
            compareCount.textContent = `${selectedDiamondsList.length} diamonds selected`;
        }
    }

    function toggleComparePanel() {
        if (!comparePanel) return;
        
        if (selectedDiamonds.size > 0) {
            comparePanel.style.display = 'flex';
            // Give the browser a moment to process the display change before adding the active class
            setTimeout(() => {
                comparePanel.classList.add('active');
            }, 10);
        } else {
            comparePanel.classList.remove('active');
            setTimeout(() => {
                comparePanel.style.display = 'none';
            }, 300); // Match the CSS transition duration
        }
    }

    function addToCompare(button) {
        console.log('Adding diamond to compare:', button.dataset);
        
        const diamondCard = button.closest('.diamond-card');
        if (!diamondCard) {
            console.error('Diamond card not found!');
            return;
        }

        const diamondId = button.dataset.id;
        console.log('Diamond ID:', diamondId);

        if (selectedDiamonds.has(diamondId)) {
            console.log('Diamond already in comparison, removing...');
            removeFromCompare(diamondId);
            return;
        }

        if (selectedDiamondsList.length >= maxCompare) {
            alert(`You can only compare up to ${maxCompare} diamonds at a time.`);
            return;
        }

        // Add to selected set
        selectedDiamonds.add(diamondId);
        button.classList.add('active');

        // Create diamond object
        const diamond = {
            id: diamondId,
            shape: button.dataset.shape,
            carat: button.dataset.carat,
            color: diamondCard.querySelector('.spec:nth-child(2)')?.textContent.replace('Color: ', '') || 'N/A',
            clarity: diamondCard.querySelector('.spec:nth-child(3)')?.textContent.replace('Clarity: ', '') || 'N/A',
            type: diamondCard.querySelector('.spec:nth-child(4)')?.textContent.replace('Type: ', '') || 'N/A',
            price: button.dataset.price,
            image: diamondCard.querySelector('img')?.src || '/static/images/default_diamond.png'
        };

        console.log('Created diamond object:', diamond);
        selectedDiamondsList.push(diamond);
        
        // Show compare panel and update
        toggleComparePanel();
        updateComparisonTable();
        saveCompareToStorage();
    }

    function removeFromCompare(diamondId) {
        console.log('Removing diamond from compare:', diamondId);
        
        selectedDiamonds.delete(diamondId);
        selectedDiamondsList = selectedDiamondsList.filter(d => d.id !== diamondId);
        
        const button = document.querySelector(`.compare-button[data-id="${diamondId}"]`);
        if (button) {
            button.classList.remove('active');
        }
        
        updateComparisonTable();
        toggleComparePanel();
        saveCompareToStorage();
    }

    // Load compare diamonds from storage on page load
    loadCompareFromStorage();
    updateComparisonTable();
    toggleComparePanel();
    // Set compare button states
    selectedDiamondsList.forEach(diamond => {
        const btn = document.querySelector(`.compare-button[data-id="${diamond.id}"]`);
        if (btn) btn.classList.add('active');
    });

    // Event Listeners
    document.addEventListener('click', (e) => {
        const compareButton = e.target.closest('.compare-button');
        if (compareButton) {
            console.log('Compare button clicked:', compareButton);
            e.preventDefault();
            addToCompare(compareButton);
        }

        const removeButton = e.target.closest('.remove-from-compare');
        if (removeButton) {
            console.log('Remove button clicked:', removeButton);
            e.preventDefault();
            removeFromCompare(removeButton.dataset.id);
        }
    });

    if (closeCompare) {
        closeCompare.addEventListener('click', () => {
            console.log('Closing compare panel');
            comparePanel.classList.remove('active');
            setTimeout(() => {
                comparePanel.style.display = 'none';
            }, 300);
        });
    }
    
    if (clearAllCompare) {
        clearAllCompare.addEventListener('click', () => {
            console.log('Clearing all comparisons');
            selectedDiamonds.clear();
            selectedDiamondsList = [];
            document.querySelectorAll('.compare-button.active').forEach(btn => {
                btn.classList.remove('active');
            });
            updateComparisonTable();
            toggleComparePanel();
            saveCompareToStorage();
        });
    }

    if (comparisonTable) {
        comparisonTable.addEventListener('click', function(e) {
            updateComparisonTable();
            if (selectedDiamonds.size === 0) {
                toggleComparePanel();
            }
            saveCompareToStorage();
        });
    }

    // Enhanced event delegation for all diamond action buttons
    document.addEventListener('click', (e) => {
        // View button handling
        const viewButton = e.target.closest('.view-button');
        if (viewButton) {
            e.preventDefault();
            if (loadingIndicator) {
                loadingIndicator.style.display = 'flex';
            }
            // Navigate to the href of the button
            window.location.href = viewButton.href;
        }

        // Video button handling
        const videoButton = e.target.closest('.video-button');
        if (videoButton) {
            e.preventDefault();
            const videoUrl = videoButton.href;
            if (videoUrl) {
                window.open(videoUrl, '_blank');
            }
        }
    });

    // Animate diamond cards on scroll
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    const diamondCards = document.querySelectorAll('.diamond-card');
    diamondCards.forEach(card => {
        observer.observe(card);
    });

    // Debug logging for initial state
    console.log('Initial selected diamonds:', selectedDiamondsList);
    console.log('Compare button elements:', document.querySelectorAll('.compare-button').length);
    console.log('Initialization complete');
});
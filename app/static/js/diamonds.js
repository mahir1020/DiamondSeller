document.addEventListener('DOMContentLoaded', () => {
    // ============ CONSTANTS ============
    const MAX_COMPARE_DIAMONDS = 6;
    const DEFAULT_DIAMOND_IMAGE = '/static/images/default_diamond.png';
    const API_ENDPOINT = '/api/diamonds';

    // ============ STATE MANAGEMENT ============
    let selectedDiamonds = new Set();
    let selectedDiamondsList = [];
    let NoDiamondsFound = false;

    // ============ DOM ELEMENTS ============
    const elements = {
        diamondGrid: document.querySelector('.diamond-grid'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        filterToggle: document.getElementById('filterToggle'),
        filterSection: document.getElementById('filterSection'),
        comparePanel: document.getElementById('comparePanel'),
        closeCompare: document.getElementById('closeCompare'),
        clearAllCompare: document.getElementById('clearAllCompare'),
        comparisonTable: document.getElementById('comparisonTable'),
        compareCount: document.querySelector('.compare-count'),
        resultsCounter: document.querySelector('.results-counter'),
        pagination: document.querySelector('.pagination'),
        resetButton: document.getElementById('resetFilters'),
        // Ensure these elements exist in your HTML
        compareBar: document.getElementById('compareBar'),
        compareDiamonds: document.getElementById('compareDiamonds'),
        viewCompare: document.getElementById('viewCompare'),
        clearAllComparePanel: document.getElementById('clearAllComparePanel'),
    };


    // ============ SLIDER CONFIGURATION ============
    const numericSliders = [
        {
            name: 'carat',
            min: 0,
            max: 10,
            step: 0.01,
            format: (val) => parseFloat(val).toFixed(2),
        },
        {
            name: 'price',
            min: 0,
            max: 150000,
            step: 100,
            format: (val) => '$' + parseInt(val).toLocaleString(),
        },
    ];

    const categorySliders = [
        {
            name: 'color',
            values: ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L-Z'],
        },
        {
            name: 'cut',
            values: ['I', 'EX', 'VG', 'G', 'F', 'None', 'N/A'],
        },
        {
            name: 'clarity',
            values: ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1-I3'],
        },
    ];

    // ============ UTILITY FUNCTIONS ============
    /**
     * Debounce function to limit how often a function is called
     */
    function debounce(func, delay) {
        let timeout;
        return function () {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, arguments), delay);
        };
    }

    /**
     * Safely get value from DOM element, with fallback
     */
    function getElementValue(id, fallback = 0) {
        const el = document.getElementById(id);
        return el ? parseFloat(el.value) : fallback;
    }

    /**
     * Save comparison list to localStorage
     */
    function saveCompareToStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('compareDiamonds', JSON.stringify(Array.from(selectedDiamondsList)));
            }
        } catch (e) {
            console.warn('LocalStorage not available:', e);
        }
    }

    /**
     * Load comparison list from localStorage
     */
    function loadCompareFromStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                const data = localStorage.getItem('compareDiamonds');
                if (data) {
                    const arr = JSON.parse(data);
                    selectedDiamondsList = arr;
                    selectedDiamonds = new Set(arr.map(d => d.id.toString()));
                }
            }
        } catch (e) {
            console.warn('Error loading from localStorage:', e);
            selectedDiamondsList = [];
            selectedDiamonds = new Set();
        }
    }

    /**
     * Update the results counter
     */
    function updateResultsCounter(total) {
        if (elements.resultsCounter) {
            elements.resultsCounter.textContent = `Showing ${Math.min(12, total)} of ${total} diamonds`;
        } else {
            console.warn('resultsCounter element not found!');
        }
    }

    // ============ API FUNCTIONS ============
    /**
     * Fetch diamonds from API with current filters
     */
    async function updateDiamonds(page = 1) {
        if (elements.loadingIndicator) {
            elements.loadingIndicator.style.display = 'flex';
        }

        // Get selected diamond type
        const selectedTypeButton = document.querySelector('.tab-button.active');
        const diamondType = selectedTypeButton ? selectedTypeButton.dataset.type : 'natural';

        // Get selected diamond shape
        const selectedShapeItem = document.querySelector('.shape-item.selected');
        const diamondShape = selectedShapeItem ? selectedShapeItem.dataset.shape : '';

        const filters = {
            carat_min: getElementValue('caratMin'),
            carat_max: getElementValue('caratMax'),
            price_min: getElementValue('priceMin'),
            price_max: getElementValue('priceMax'),
            color_min: getElementValue('colorMin', 0),
            color_max: getElementValue('colorMax', 8),
            cut_min: getElementValue('cutMin', 0),
            cut_max: getElementValue('cutMax', 5),
            clarity_min: getElementValue('clarityMin', 0),
            clarity_max: getElementValue('clarityMax', 7),
            diamond_type: diamondType,
            diamond_shape: diamondShape,
            page,
        };

        console.log('Filters:', filters);

        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value && !isNaN(value) || (typeof value === 'string' && value.trim() !== '')) {
                queryParams.append(key, value);
            }
        });

        console.log('API URL:', `${API_ENDPOINT}?${queryParams.toString()}`);

        try {
            const response = await fetch(`${API_ENDPOINT}?${queryParams.toString()}`);
            console.log('API Response Status:', response.status);
            const data = await response.json();
            console.log('API Response Data:', data);
            updateDiamondGrid(data.diamonds);
            updateResultsCounter(data.total);
            updatePagination(data.page, data.total_pages);
            console.log(`Total diamonds: ${data.total}, Total pages: ${data.total_pages}`);
        } catch (error) {
            console.error('Error fetching diamonds:', error);
        } finally {
            if (elements.loadingIndicator) {
                elements.loadingIndicator.style.display = 'none';
            }
        }
    }


    /**
     * Update the diamond grid with new data
     */
    function updateDiamondGrid(diamonds) {
        if (!elements.diamondGrid) {
            console.error('diamondGrid not found!');
            return;
        }

        console.log('Diamonds received:', diamonds);

        if (!diamonds || diamonds.length === 0) {
            console.warn('No diamonds to display!');
            elements.diamondGrid.innerHTML = `
            <div class="no-results-wrapper">


                <div class="no-results">
                    <div class="no-results-content">

                    <div class="no-results-text">
                        <p>No diamonds found matching your filters.</p>
                        <p>You can submit a request for the diamond you want and our team will get back to you.</p>
                    </div>
                    <!-- Form on the left -->
                   <form id="diamondRequestForm" enctype="multipart/form-data">
                        <div class="form-container">
                            <!-- Left side -->
                            <div class="form-left">
                                <h2>Request Your Diamond</h2>
                                <br>  
                                <!-- Diamond Information -->
                                <label>
                                    Diamond Type:
                                    <input type="text" name="diamond_type" placeholder="e.g. Natural, HPHT, CVD" required>
                                </label>
                                <label>
                                    Diamond Shape:
                                    <input type="text" name="shape" placeholder="e.g. Round, Princess, Cushion" required>
                                </label>
                                <label>
                                    Carat:
                                    <input type="number" name="carat" step="0.01" placeholder="e.g. 1.25" required>
                                </label>
                                <label>
                                    Color:
                                    <input type="text" name="color" placeholder="e.g. D, E, F" required>
                                </label>
                                <label>
                                    Clarity:
                                    <input type="text" name="clarity" placeholder="e.g. VS1, SI1" required>
                                </label>
                            </div>

                            <!-- Right side -->
                            <div class="form-right">

                                <br>
                                <br>
                                <br>
                                <label>
                                    Price (optional):
                                    <input type="number" name="price" step="0.01">
                                </label>
                                <label>
                                    Upload Image (optional):
                                    <input type="file" name="image" accept="image/*">
                                </label>
                                <!-- Personal Information -->
                                <label>
                                    Full Name:
                                    <input type="text" name="full_name" placeholder="Your Name" required>
                                </label>
                                <label>
                                    Email:
                                    <input type="email" name="email" placeholder="you@example.com" required>
                                </label>
                                <label>
                                    Phone Number (optional):
                                    <input type="tel" name="phone" placeholder="e.g. +1 123-456-7890">
                                </label>
                            </div>
                        </div>

                        <button type="submit">Submit Request</button>
                        <div id="requestMessage"></div>
                    </form>
                </div>
            </div>`;

            // Add form submit handler
            const form = document.getElementById('diamondRequestForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);

                try {
                    const response = await fetch('/diamond-request', {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();
                    document.getElementById('requestMessage').innerText = result.message || "Request submitted!";
                    form.reset();
                } catch (err) {
                    console.error(err);
                    document.getElementById('requestMessage').innerText = "Error submitting request.";
                }
            });

            return;
        }

        // --- Existing diamond rendering code ---
        diamonds.sort((a, b) => {
            if (a.image_url && !b.image_url) return -1;
            if (!a.image_url && b.image_url) return 1;
            return 0;
        });

        elements.diamondGrid.innerHTML = diamonds.map(diamond => `
            <div class="diamond-card" data-id="${diamond.id}">
                <div class="card-badge">${diamond.shape}</div>
                <img src="${diamond.image_url || DEFAULT_DIAMOND_IMAGE}" alt="${diamond.shape} Diamond">
                <div class="diamond-info">
                    <h3>${diamond.shape} Diamond</h3>
                    <div class="diamond-specs">
                        <span class="spec"><i class="fas fa-weight"></i> ${diamond.carat.toFixed(2)} Carats</span>
                        <span class="spec"><i class="fas fa-palette"></i> Color: ${diamond.color}</span>
                        <span class="spec"><i class="fas fa-gem"></i> Clarity: ${diamond.clarity}</span>
                        <span class="spec"><i class="fas fa-certificate"></i> Type: ${diamond.diamond_type}</span>
                    </div>
                    <p class="price">$${diamond.price.toFixed(2)}</p>
                    <div class="diamond-actions">
                        <a href="/diamond/${diamond.id}" class="view-button">View Details</a>
                        ${diamond.video_url ? `<a href="${diamond.video_url}" target="_blank" class="video-button"><i class="fas fa-play-circle"></i></a>` : ''}
                        <button type="button" class="compare-button ${selectedDiamonds.has(diamond.id.toString()) ? 'active' : ''}" data-id="${diamond.id}" data-shape="${diamond.shape}" data-carat="${diamond.carat}" data-price="${diamond.price}" title="Add to Compare">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }



    /**
     * Update pagination controls
     */
    function updatePagination(currentPage, totalPages) {
        if (!elements.pagination) return;
        let paginationHTML = '';
        if (currentPage > 1) {
            paginationHTML += `
                <a href="#" class="page-link prev" data-page="${currentPage - 1}" aria-label="Previous page">
                    <i class="fas fa-chevron-left"></i>
                </a>
            `;
        }
        paginationHTML += `<span class="page-info">Page ${currentPage} of ${totalPages}</span>`;
        if (currentPage < totalPages) {
            paginationHTML += `
                <a href="#" class="page-link next" data-page="${currentPage + 1}" aria-label="Next page">
                    <i class="fas fa-chevron-right"></i>
                </a>
            `;
        }
        elements.pagination.innerHTML = paginationHTML;
        elements.pagination.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                updateDiamonds(parseInt(link.dataset.page));
            });
        });
    }

    // ============ COMPARISON FUNCTIONS ============
    /**
     * Update the comparison table UI
     */
    function updateComparisonTable() {
        if (!elements.comparisonTable) return;
        const headerRow = elements.comparisonTable.querySelector('thead tr');
        if (!headerRow) return;
        headerRow.innerHTML = '<th>Properties</th>';
        selectedDiamondsList.forEach(diamond => {
            headerRow.innerHTML += `
                <th>
                    <div class="diamond-header">
                        <img src="${diamond.image || DEFAULT_DIAMOND_IMAGE}" alt="${diamond.shape}" width="50">
                        <button class="remove-from-compare" data-id="${diamond.id}" aria-label="Remove from comparison">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </th>
            `;
        });
        const rows = elements.comparisonTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const property = row.className.replace('-row', '');
            const firstCell = row.cells[0].outerHTML;
            row.innerHTML = firstCell;
            selectedDiamondsList.forEach(diamond => {
                row.innerHTML += `<td>${diamond[property] || 'N/A'}</td>`;
            });
        });
        if (elements.compareCount) {
            elements.compareCount.textContent = `${selectedDiamondsList.length} diamonds selected`;
        }
    }

    /**
     * Toggle the comparison panel visibility
     */
    function toggleComparePanel() {
        if (!elements.comparePanel) {
            console.warn('comparePanel element not found!');
            return;
        }

        if (selectedDiamonds.size > 0) {
            elements.comparePanel.style.display = 'flex';
            setTimeout(() => {
                elements.comparePanel.classList.add('active');
            }, 10);
        } else {
            elements.comparePanel.classList.remove('active');
            setTimeout(() => {
                elements.comparePanel.style.display = 'none';
            }, 300);
        }
    }


    function toggleCompareBar() {
        if (!elements.compareBar) return;

        if (selectedDiamonds.size > 0) {
            elements.compareBar.classList.add('active');
        } else {
            elements.compareBar.classList.remove('active');
        }
    }

    function updateComparisonBar() {
        if (!elements.compareDiamonds) return;

        elements.compareDiamonds.innerHTML = '';
        selectedDiamondsList.forEach(diamond => {
            elements.compareDiamonds.innerHTML += `
                <div class="compare-diamond-item" data-id="${diamond.id}">
                    <img src="${diamond.image || DEFAULT_DIAMOND_IMAGE}" alt="${diamond.shape}" width="40">
                    <div class="compare-diamond-info">
                        <p>${diamond.shape}</p>
                        <span>${diamond.carat} Carat</span>
                    </div>
                    <button class="remove-compare" data-id="${diamond.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });

        toggleCompareBar();
    }



    document.addEventListener('DOMContentLoaded', () => {
        // Set default diamond type to 'natural'
        document.querySelector('.tab-button[data-type="natural"]').classList.add('active');

        // Set default diamond shape to 'round'
        document.querySelector('.shape-item[data-shape="round"]').classList.add('selected');

        // Load diamonds with default filters
        updateDiamonds();
    });


    // Handle diamond type tab selection
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function () {
            // Remove active class from all buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });

            // Add active class to the clicked button
            this.classList.add('active');

            // Update the diamond type filter
            updateDiamonds();
        });
    });


    // Handle diamond shape selection
    document.querySelectorAll('.shape-item').forEach(item => {
        item.addEventListener('click', function () {
            // Remove selected class from all shape items
            document.querySelectorAll('.shape-item').forEach(shape => {
                shape.classList.remove('selected');
            });

            // Add selected class to the clicked shape item
            this.classList.add('selected');

            // Update the diamond shape filter
            updateDiamonds();
        });
    });






    /**
     * Add a diamond to the comparison list
     */
    function addToCompare(button) {
        const diamondCard = button.closest('.diamond-card');
        if (!diamondCard) return;

        const diamondId = button.dataset.id;
        if (selectedDiamonds.has(diamondId)) {
            removeFromCompare(diamondId);
            return;
        }

        if (selectedDiamondsList.length >= MAX_COMPARE_DIAMONDS) {
            alert(`You can only compare up to ${MAX_COMPARE_DIAMONDS} diamonds at a time.`);
            return;
        }

        selectedDiamonds.add(diamondId);
        button.classList.add('active');

        const diamond = {
            id: diamondId,
            shape: button.dataset.shape || 'N/A',
            carat: button.dataset.carat || 'N/A',
            color: diamondCard.querySelector('.spec:nth-child(2)')?.textContent.replace('Color: ', '') || 'N/A',
            clarity: diamondCard.querySelector('.spec:nth-child(3)')?.textContent.replace('Clarity: ', '') || 'N/A',
            type: diamondCard.querySelector('.spec:nth-child(4)')?.textContent.replace('Type: ', '') || 'N/A',
            price: button.dataset.price || 'N/A',
            image: diamondCard.querySelector('img')?.src || DEFAULT_DIAMOND_IMAGE,
        };

        selectedDiamondsList.push(diamond);

        updateComparisonBar();
        updateComparisonTable();
        saveCompareToStorage();
    }


    /**
     * Remove a diamond from the comparison list
     */
    function removeFromCompare(diamondId) {
        selectedDiamonds.delete(diamondId);
        selectedDiamondsList = selectedDiamondsList.filter(d => d.id !== diamondId);

        const button = document.querySelector(`.compare-button[data-id="${diamondId}"]`);
        if (button) {
            button.classList.remove('active');
        }

        updateComparisonBar();
        updateComparisonTable();
        saveCompareToStorage();
    }


    // ============ SLIDER INITIALIZATION ============
    /**
     * Initialize a range slider (carat, price)
     */
    function initializeNumericSlider({ name, min, max, step, format }) {
        const minSlider = document.getElementById(`${name}Min`);
        const maxSlider = document.getElementById(`${name}Max`);
        const minValue = document.getElementById(`${name}MinValue`);
        const maxValue = document.getElementById(`${name}MaxValue`);
        const fill = document.getElementById(`${name}Fill`);
        if (!minSlider || !maxSlider || !fill) return;
        function updateRange() {
            let min = parseFloat(minSlider.value);
            let max = parseFloat(maxSlider.value);
            if (min >= max) minSlider.value = max - step;
            if (max <= min) maxSlider.value = min + step;
            const minPercent = ((min - min) / (max - min)) * 100;
            const maxPercent = ((max - min) / (max - min)) * 100;
            fill.style.left = minPercent + '%';
            fill.style.width = (maxPercent - minPercent) + '%';
            if (minValue && maxValue) {
                minValue.value = format(min);
                maxValue.value = format(max);
            }
            debouncedUpdate();
        }
        minSlider.addEventListener('input', updateRange);
        maxSlider.addEventListener('input', updateRange);
        if (minValue && maxValue && name !== 'price') {
            minValue.addEventListener('change', () => { minSlider.value = minValue.value; updateRange(); });
            maxValue.addEventListener('change', () => { maxSlider.value = maxValue.value; updateRange(); });
        }
        updateRange();
    }

    /**
     * Initialize a category slider (color, cut, clarity)
     */
    function initializeCategorySlider({ name, values }) {
        const minSlider = document.getElementById(`${name}Min`);
        const maxSlider = document.getElementById(`${name}Max`);
        const fill = document.getElementById(`${name}Fill`);
        const ticks = document.getElementById(`${name}Ticks`);
        if (!minSlider || !maxSlider || !fill || !ticks) return;
        function updateCategoryRange() {
            let min = parseInt(minSlider.value);
            let max = parseInt(maxSlider.value);
            if (min >= max) minSlider.value = max - 1;
            if (max <= min) maxSlider.value = min + 1;
            const minPercent = (min / (values.length - 1)) * 100;
            const maxPercent = (max / (values.length - 1)) * 100;
            fill.style.left = minPercent + '%';
            fill.style.width = (maxPercent - minPercent) + '%';
            const tickElements = ticks.querySelectorAll('.tick');
            tickElements.forEach((tick, index) => {
                tick.classList.toggle('active', index >= min && index <= max);
            });
            debouncedUpdate();
        }
        minSlider.min = 0;
        minSlider.max = values.length - 1;
        maxSlider.min = 0;
        maxSlider.max = values.length - 1;
        minSlider.addEventListener('input', updateCategoryRange);
        maxSlider.addEventListener('input', updateCategoryRange);
        updateCategoryRange();
    }

    // ============ EVENT LISTENERS ============
    const debouncedUpdate = debounce(updateDiamonds, 300);

    // Initialize sliders
    numericSliders.forEach(initializeNumericSlider);
    categorySliders.forEach(initializeCategorySlider);

    // Reset button
    if (elements.resetButton) {
        elements.resetButton.addEventListener('click', () => {
            console.log('Resetting all filters...');
            document.getElementById('caratMin').value = 0;
            document.getElementById('caratMax').value = 10;
            document.getElementById('priceMin').value = 0;
            document.getElementById('priceMax').value = 2000000;
            document.getElementById('colorMin').value = 0;
            document.getElementById('colorMax').value = 8;
            document.getElementById('cutMin').value = 0;
            document.getElementById('cutMax').value = 5;
            document.getElementById('clarityMin').value = 0;
            document.getElementById('clarityMax').value = 7;
            document.querySelectorAll('.range-input').forEach(input => {
                input.dispatchEvent(new Event('input'));
            });
            updateDiamonds();
        });
    }

    // Filter toggle for mobile
    if (elements.filterToggle && elements.filterSection) {
        elements.filterToggle.addEventListener('click', () => {
            elements.filterSection.classList.toggle('active');
            elements.filterToggle.classList.toggle('active');
        });
    }

    // View Compare Button
    if (elements.viewCompare) {
        elements.viewCompare.addEventListener('click', () => {
            toggleComparePanel();
        });
    }

    // Close Compare Panel
    if (elements.closeCompare) {
        elements.closeCompare.addEventListener('click', () => {
            elements.comparePanel.classList.remove('active');
            setTimeout(() => {
                elements.comparePanel.style.display = 'none';
            }, 300);
        });
    }

    // Clear All Buttons
    if (elements.clearAllCompare) {
        elements.clearAllCompare.addEventListener('click', () => {
            selectedDiamonds.clear();
            selectedDiamondsList = [];
            document.querySelectorAll('.compare-button.active').forEach(btn => {
                btn.classList.remove('active');
            });
            updateComparisonBar();
            updateComparisonTable();
            saveCompareToStorage();
        });
    }

    if (elements.clearAllComparePanel) {
        elements.clearAllComparePanel.addEventListener('click', () => {
            selectedDiamonds.clear();
            selectedDiamondsList = [];
            document.querySelectorAll('.compare-button.active').forEach(btn => {
                btn.classList.remove('active');
            });
            updateComparisonBar();
            updateComparisonTable();
            saveCompareToStorage();
        });
    }

    // Remove Diamond from Comparison Bar
    document.addEventListener('click', (e) => {
        const removeButton = e.target.closest('.remove-compare');
        if (removeButton) {
            e.preventDefault();
            removeFromCompare(removeButton.dataset.id);
        }
    });

    // Load comparison list from storage
    function loadCompareFromStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                const data = localStorage.getItem('compareDiamonds');
                if (data) {
                    const arr = JSON.parse(data);
                    selectedDiamondsList = arr;
                    selectedDiamonds = new Set(arr.map(d => d.id.toString()));

                    // Update UI
                    updateComparisonBar();
                    updateComparisonTable();
                    toggleComparePanel();
                }
            }
        } catch (e) {
            console.warn('Error loading from localStorage:', e);
            selectedDiamondsList = [];
            selectedDiamonds = new Set();
        }
    }


    // Unified click handler
    document.addEventListener('click', (e) => {
        const compareButton = e.target.closest('.compare-button');
        if (compareButton) {
            e.preventDefault();
            addToCompare(compareButton);
            return;
        }
        const removeButton = e.target.closest('.remove-from-compare');
        if (removeButton) {
            e.preventDefault();
            removeFromCompare(removeButton.dataset.id);
            return;
        }
        const viewButton = e.target.closest('.view-button');
        if (viewButton) {
            e.preventDefault();
            if (elements.loadingIndicator) {
                elements.loadingIndicator.style.display = 'flex';
            }
            window.location.href = viewButton.href;
            return;
        }
        const videoButton = e.target.closest('.video-button');
        if (videoButton) {
            e.preventDefault();
            const videoUrl = videoButton.href;
            if (videoUrl) {
                window.open(videoUrl, '_blank');
            }
            return;
        }
    });

    // Dropdown functionality
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                dropdowns.forEach(d => {
                    if (d !== dropdown) d.classList.remove('active');
                });
                dropdown.classList.toggle('active');
            });
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    });

    // Scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });
    const diamondCards = document.querySelectorAll('.diamond-card');
    diamondCards.forEach(card => {
        observer.observe(card);
    });

    console.log('Diamond features initialized successfully');
});
// ============ END OF SCRIPT ============
// This script handles the diamond filtering, comparison, and display functionalities.
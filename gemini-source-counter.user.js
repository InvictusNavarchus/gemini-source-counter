// ==UserScript==
// @name         Gemini Deep Research Source Counter
// @icon         https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg
// @namespace    http://tampermonkey.net/
// @version      0.7.3
// @description  Counts used and unused sources on Gemini deep research results and displays the count at the top. Also numbers each source item. Works across chat switches.
// @author       Invictus
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/InvictusNavarchus/gemini-source-counter/master/gemini-source-counter.user.js
// @downloadURL  https://raw.githubusercontent.com/InvictusNavarchus/gemini-source-counter/master/gemini-source-counter.user.js
// ==/UserScript==

(function() {
    'use strict';

    const COUNTER_ID_PREFIX = 'gemini-source-counter-display-';
    const NUMBER_CLASS = 'gemini-source-item-number'; // Class to identify added numbers
    const PROCESSED_ATTR = 'data-sources-counted'; // Attribute to mark processed containers
    const RESEARCH_PROCESSED_ATTR = 'data-research-counted'; // Attribute for research containers
    const RESEARCH_IN_PROGRESS_ATTR = 'data-research-in-progress'; // Attribute for active research

    console.log("Gemini Source Counter: Script loaded. Version 0.7.3");

    // --- Selectors ---
    const overallResponseParentSelector = 'response-container';
    const sourceListContainerSelector = 'deep-research-source-lists, source-list-container';
    const usedSourcesListSelector = 'div.source-list.used-sources, div.used-sources';
    const unusedSourcesListSelector = 'div.source-list.unused-sources, div.unused-sources';
    const sourceListItemSelector = 'browse-web-item, browse-chip-item'; // Support both old and new structures
    const insertionPointSelector = '.response-container-content, .research-content';
    
    // New selectors for research websites in thinking panel
    const thinkingPanelSelector = 'thinking-panel';
    const researchWebsitesContainerSelector = '.browse-container';
    const researchWebsitesItemSelector = 'browse-web-chip';
    const researchWebsitesItemContentSelector = '.browse-chip';
    
    // Deep research immersive panel selector (new addition for the updated UI)
    const deepResearchPanelSelector = 'deep-research-immersive-panel';
    
    // Active research panel selector
    const extendedResponsePanelSelector = 'extended-response-panel';
    
    // Helper function to find the best element to attach source numbering to in a source item
    function findSourceItemLabelTarget(item) {
        // Strategy 1: Find the title-container (2025 May update, most specific target)
        const titleContainer = item.querySelector('div.title-container');
        
        // Strategy 2: Find the browse-item inside the item (older structure)
        const browseItem = item.querySelector('.browse-item');
        
        // Strategy 3: Find .mat-ripple.browse-item (newer structure) 
        const matRippleItem = item.querySelector('.mat-ripple.browse-item');
        
        // Strategy 4: Find span with data-test-id="content" (another 2025 variant)
        const linkContentSpan = item.querySelector('span[data-test-id="content"]');
        const linkMatRipple = linkContentSpan ? linkContentSpan.querySelector('.mat-ripple.browse-item') : null;

        // Strategy 5: Find .browse-chip (alternative structure)
        const browseChip = item.querySelector('.browse-chip');
        
        // Choose the appropriate content element based on what's available
        return titleContainer || browseItem || matRippleItem || linkMatRipple || browseChip || item;
    }
    
    // Function to check if an item already has numbering
    function isAlreadyNumbered(item) {
        // Check if the item itself or any of its children has our number class
        return item.querySelector(`.${NUMBER_CLASS}`) !== null;
    }
    
    // Function to process source items - accepts the source item element and its index
    function processSourceItem(item, index) {
        if (DEBUG) {
            console.log(`Gemini Source Counter DEBUG: Processing source item ${index}`, item);
            console.log(`  HTML preview: ${item.outerHTML.substring(0, 200)}...`);
        }

        // Get the target element for adding the number
        const contentElement = findSourceItemLabelTarget(item);
        
        // Skip if already has number or if no valid content element
        if (!contentElement || isAlreadyNumbered(item)) {
            if (DEBUG) {
                console.log(`Gemini Source Counter DEBUG: Skipping item ${index}, already numbered or no content element`);
            }
            return;
        }
        
        // Create number span
        const numberSpan = document.createElement('span');
        numberSpan.className = NUMBER_CLASS;
        numberSpan.textContent = `${index + 1}. `;
        numberSpan.style.fontWeight = 'bold';
        numberSpan.style.marginRight = '5px';
        numberSpan.style.position = 'absolute';
        numberSpan.style.left = '8px';
        numberSpan.style.top = '50%';
        numberSpan.style.transform = 'translateY(-50%)';
        numberSpan.style.zIndex = '10';
        
        // Add some positioning to the container element
        contentElement.style.position = 'relative';
        contentElement.style.paddingLeft = '25px';
        
        // Insert number at beginning of element
        contentElement.insertBefore(numberSpan, contentElement.firstChild);
        
        console.log(`Gemini Source Counter: Added number ${index + 1} to source item`);
    }
    
    // Debug helper function - logs key structure info when enabled
    const DEBUG = false; // Set to true to enable debug logging
    
    // Function to inspect the HTML structure of source items for debugging
    function inspectSourceStructure(sourceListContainer) {
        if (!DEBUG) return;
        
        console.log("Gemini Source Counter DEBUG: Analyzing source container structure", sourceListContainer);
        
        // Check used sources
        const usedList = sourceListContainer.querySelector(usedSourcesListSelector);
        if (usedList) {
            const firstItem = usedList.querySelector(sourceListItemSelector);
            if (firstItem) {
                console.log("Gemini Source Counter DEBUG: Used source item structure:", firstItem);
                console.log("  innerHTML sample:", firstItem.innerHTML.substring(0, 200) + "...");
                
                // Log all child elements to find the right selectors
                const allChildren = [];
                firstItem.querySelectorAll("*").forEach(child => {
                    allChildren.push({
                        tagName: child.tagName,
                        className: child.className,
                        id: child.id,
                        dataTestId: child.getAttribute('data-test-id')
                    });
                });
                console.log("  All child elements:", allChildren);
            }
        }
    }
    function debugLog(message, element = null) {
        if (!DEBUG) return;
        
        if (element) {
            console.log(`Gemini Source Counter DEBUG: ${message}`, element);
            if (element instanceof Element) {
                console.log(`  Element tag: ${element.tagName}`);
                console.log(`  Element classes: ${element.className}`);
                console.log(`  Element children: ${element.children.length}`);
            }
        } else {
            console.log(`Gemini Source Counter DEBUG: ${message}`);
        }
    }

    // Function to create counter display for active research
    function createActiveResearchCounter(responsePanel) {
        // Skip if already processed
        if (responsePanel.hasAttribute(RESEARCH_IN_PROGRESS_ATTR)) {
            return null;
        }
        
        const containerId = responsePanel.id || 
            `active-research-${Math.random().toString(36).substring(2, 9)}`;
        if (!responsePanel.id) {
            responsePanel.id = containerId;
        }
        
        const counterID = `${COUNTER_ID_PREFIX}${containerId}`;
        
        // Check if counter already exists
        let displayDiv = document.getElementById(counterID);
        if (displayDiv) {
            return displayDiv;
        }
        
        // Create display element
        displayDiv = document.createElement('div');
        displayDiv.id = counterID;
        displayDiv.textContent = `Research in progress: 0 websites visited`;
        displayDiv.style.fontWeight = 'bold';
        displayDiv.style.padding = '8px 16px 4px 24px';
        displayDiv.style.fontSize = '0.9em';
        displayDiv.style.color = 'var(--mat-sidenav-content-text-color, #3c4043)';
        displayDiv.style.borderBottom = '1px solid var(--mat-divider-color, #dadce0)';
        displayDiv.style.marginBottom = '8px';
        
        // Find insertion point - try different options for different panel structures
        const toolbar = responsePanel.querySelector('toolbar');
        const header = responsePanel.querySelector('header') || responsePanel.querySelector('.header');
        const researchContent = responsePanel.querySelector('.research-content');
        
        if (toolbar) {
            toolbar.insertAdjacentElement('afterend', displayDiv);
            console.log(`Gemini Source Counter: Created counter after toolbar for ${containerId}`);
        } else if (header) {
            header.insertAdjacentElement('afterend', displayDiv);
            console.log(`Gemini Source Counter: Created counter after header for ${containerId}`);
        } else if (researchContent) {
            researchContent.insertAdjacentElement('afterbegin', displayDiv);
            console.log(`Gemini Source Counter: Created counter at start of research content for ${containerId}`);
        } else {
            // Fallback insertion if no suitable insertion point is found
            responsePanel.insertAdjacentElement('afterbegin', displayDiv);
            console.log(`Gemini Source Counter: Created counter (fallback method) for ${containerId}`);
        }
        
        // Mark as processed
        responsePanel.setAttribute(RESEARCH_IN_PROGRESS_ATTR, 'true');
        
        return displayDiv;
    }

    // Function to update research websites count and numbering
    function processResearchWebsites(thinkingPanel, displayDiv) {
        if (!thinkingPanel) {
            return 0;
        }
        
        let researchWebsitesCount = 0;
        // In the new immersive panel, browse-container elements can appear directly in the thinking panel
        const researchContainers = thinkingPanel.querySelectorAll(researchWebsitesContainerSelector);
        
        researchContainers.forEach(container => {
            // Skip if this specific container already processed for numbering
            // but still count items for the total
            const wasProcessed = container.hasAttribute(RESEARCH_PROCESSED_ATTR);
            
            const researchItems = container.querySelectorAll(researchWebsitesItemSelector);
            researchWebsitesCount += researchItems.length;
            
            // Number research websites if not already numbered
            if (researchItems.length > 0 && !wasProcessed) {
                console.log(`Gemini Source Counter: Numbering ${researchItems.length} research websites.`);
                
                researchItems.forEach((item, index) => {
                    // Skip if already numbered
                    if (isAlreadyNumbered(item)) return;
                    
                    // Attempt to find the inner element - support both old and new structures
                    const contentElement = item.querySelector(researchWebsitesItemContentSelector) || 
                                          item.shadowRoot?.querySelector(researchWebsitesItemContentSelector) ||
                                          item;
                    
                    if (!contentElement) return;
                    
                    const numberSpan = document.createElement('span');
                    numberSpan.className = NUMBER_CLASS;
                    numberSpan.textContent = `${index + 1}. `;
                    numberSpan.style.fontWeight = 'bold';
                    numberSpan.style.marginRight = '5px';
                    numberSpan.style.position = 'absolute';
                    numberSpan.style.left = '3px';
                    numberSpan.style.top = '50%';
                    numberSpan.style.transform = 'translateY(-50%)';
                    
                    contentElement.style.position = 'relative';
                    contentElement.style.paddingLeft = '25px';
                    contentElement.insertBefore(numberSpan, contentElement.firstChild);
                });
                
                // Mark container as processed
                container.setAttribute(RESEARCH_PROCESSED_ATTR, 'true');
                
                // Setup observer for this specific research container to watch for new items
                setupResearchContainerObserver(container);
            }
        });
        
        return researchWebsitesCount;
    }
    
    // Function to update the display with new research website count
    function updateResearchCount(responseContainer, isActiveResearch = false) {
        const containerId = responseContainer.id;
        const counterID = `${COUNTER_ID_PREFIX}${containerId}`;
        const displayDiv = document.getElementById(counterID);
        
        if (!displayDiv) return;
        
        // Get current counts from display text if not active research
        let usedSourcesCount = 0;
        let unusedSourcesCount = 0;
        
        if (!isActiveResearch) {
            const displayText = displayDiv.textContent;
            const usedMatch = displayText.match(/Used: (\d+)/);
            const unusedMatch = displayText.match(/Not Used: (\d+)/);
            
            usedSourcesCount = usedMatch ? parseInt(usedMatch[1]) : 0;
            unusedSourcesCount = unusedMatch ? parseInt(unusedMatch[1]) : 0;
        }
        
        // Get new research websites count
        const thinkingPanel = responseContainer.querySelector(thinkingPanelSelector);
        let researchWebsitesCount = 0;
        
        if (thinkingPanel) {
            researchWebsitesCount = processResearchWebsites(thinkingPanel, displayDiv);
            console.log(`Gemini Source Counter: Updated count - ${researchWebsitesCount} research websites in ${containerId}.`);
        }
        
        // Update display text
        if (isActiveResearch) {
            displayDiv.textContent = `Research in progress: ${researchWebsitesCount} websites visited`;
        } else {
            displayDiv.textContent = `Sources Count -> Used: ${usedSourcesCount}, Not Used: ${unusedSourcesCount}`;
            
            // Add research websites count if any
            if (researchWebsitesCount > 0) {
                displayDiv.textContent += `, Research Websites: ${researchWebsitesCount}`;
            }
        }
    }
    
    // Setup observer for research container to watch for new items
    function setupResearchContainerObserver(container) {
        const parentContainer = container.closest(overallResponseParentSelector) || 
                                container.closest(extendedResponsePanelSelector) ||
                                container.closest(deepResearchPanelSelector);
        if (!parentContainer) return;
        
        const researchObserver = new MutationObserver(function(mutations) {
            let newItemsAdded = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if any added nodes are browse-web-chip elements
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches(researchWebsitesItemSelector) || 
                                node.querySelector(researchWebsitesItemSelector)) {
                                newItemsAdded = true;
                                break;
                            }
                        }
                    }
                }
            });
            
            if (newItemsAdded) {
                console.log("Gemini Source Counter: Detected new research websites added.");
                // Temporarily remove the processed attribute to allow re-numbering
                container.removeAttribute(RESEARCH_PROCESSED_ATTR);
                const isActiveResearch = parentContainer.hasAttribute(RESEARCH_IN_PROGRESS_ATTR);
                updateResearchCount(parentContainer, isActiveResearch);
            }
        });
        
        researchObserver.observe(container, { childList: true, subtree: true });
        console.log("Gemini Source Counter: Research container observer started.");
    }
    
    // Setup observer for thinking panel to watch for new research containers
    function setupThinkingPanelObserver(thinkingPanel) {
        const parentContainer = thinkingPanel.closest(overallResponseParentSelector) || 
                              thinkingPanel.closest(extendedResponsePanelSelector) ||
                              thinkingPanel.closest(deepResearchPanelSelector);
        if (!parentContainer) return;
        
        const thinkingObserver = new MutationObserver(function(mutations) {
            let newContainersAdded = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if any added nodes are research containers or contain them
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches(researchWebsitesContainerSelector) || 
                                node.querySelector(researchWebsitesContainerSelector)) {
                                newContainersAdded = true;
                            }
                        }
                    });
                }
            });
            
            if (newContainersAdded) {
                console.log("Gemini Source Counter: Detected new research container added.");
                const isActiveResearch = parentContainer.hasAttribute(RESEARCH_IN_PROGRESS_ATTR);
                updateResearchCount(parentContainer, isActiveResearch);
            }
        });
        
        thinkingObserver.observe(thinkingPanel, { childList: true, subtree: true });
        console.log("Gemini Source Counter: Thinking panel observer started.");
    }

    // --- Process a single response container ---
    function processResponseContainer(responseContainer) {
        // Skip if already processed
        if (responseContainer.hasAttribute(PROCESSED_ATTR)) {
            return false;
        }

        // Generate a unique ID for this container
        const containerId = responseContainer.id || 
            `container-${Math.random().toString(36).substring(2, 9)}`;
        if (!responseContainer.id) {
            responseContainer.id = containerId;
        }
        
        const counterID = `${COUNTER_ID_PREFIX}${containerId}`;
        
        // Check if counter already exists for this container
        if (document.getElementById(counterID)) {
            return false;
        }

        // Try to find source lists - support both older and newer container structures
        const sourceListContainer = responseContainer.querySelector(sourceListContainerSelector);
        
        // If we have a source container, inspect its structure for debugging
        if (sourceListContainer && DEBUG) {
            inspectSourceStructure(sourceListContainer);
        }
        
        if (!sourceListContainer) {
            // This response doesn't have sources, might not be deep research
            // But still check for thinking panel in case research is in progress
            const thinkingPanel = responseContainer.querySelector(thinkingPanelSelector);
            if (!thinkingPanel) {
                // In the new structure, we might have deep-research-source-lists in other locations
                // Do a more aggressive search throughout the entire container
                const altSourceLists = responseContainer.querySelectorAll('deep-research-source-lists');
                if (altSourceLists.length === 0) {
                    return false;
                }
                
                if (DEBUG) {
                    console.log("Gemini Source Counter DEBUG: Found alternative source lists:", altSourceLists);
                    altSourceLists.forEach(list => inspectSourceStructure(list));
                }
            }
        }

        const insertionPoint = responseContainer.querySelector(insertionPointSelector);
        if (!insertionPoint) {
            return false;
        }

        // --- Count Sources and Add Numbers ---
        let usedSourcesCount = 0;
        let usedSourcesList = sourceListContainer ? sourceListContainer.querySelector(usedSourcesListSelector) : null;
        
        // Search entire response container for sources if needed
        if (!usedSourcesList) {
            usedSourcesList = responseContainer.querySelector(usedSourcesListSelector);
        }
        
        if (usedSourcesList) {
            const usedItems = usedSourcesList.querySelectorAll(sourceListItemSelector);
            usedSourcesCount = usedItems.length;
            console.log(`Gemini Source Counter: Found ${usedSourcesCount} used sources in ${containerId}.`);

            // Number used sources if not already numbered
            if (usedItems.length > 0) {
                // Check if first item is already numbered using the isAlreadyNumbered helper
                const alreadyNumbered = isAlreadyNumbered(usedItems[0]);
                
                if (!alreadyNumbered) {
                    console.log(`Gemini Source Counter: Numbering ${usedItems.length} used items.`);
                    usedItems.forEach((item, index) => {
                        processSourceItem(item, index);
                    });
                }
            }
        }

        let unusedSourcesCount = 0;
        let unusedSourcesList = sourceListContainer ? sourceListContainer.querySelector(unusedSourcesListSelector) : null;
        
        // Search entire response container for unused sources if needed
        if (!unusedSourcesList) {
            unusedSourcesList = responseContainer.querySelector(unusedSourcesListSelector);
        }
        
        if (unusedSourcesList) {
            const unusedItems = unusedSourcesList.querySelectorAll(sourceListItemSelector);
            unusedSourcesCount = unusedItems.length;
            console.log(`Gemini Source Counter: Found ${unusedSourcesCount} unused sources in ${containerId}.`);

            // Number unused sources if not already numbered
            if (unusedItems.length > 0) {
                // Check if first item is already numbered using the isAlreadyNumbered helper
                const alreadyNumbered = isAlreadyNumbered(unusedItems[0]);
                
                if (!alreadyNumbered) {
                    console.log(`Gemini Source Counter: Numbering ${unusedItems.length} unused items.`);
                    unusedItems.forEach((item, index) => {
                        processSourceItem(item, index);
                    });
                }
            }
        }
        
        // --- Count Research Websites in Thinking Panel ---
        let researchWebsitesCount = 0;
        const thinkingPanel = responseContainer.querySelector(thinkingPanelSelector);
        
        // --- Create and Insert Display Element ---
        const displayDiv = document.createElement('div');
        displayDiv.id = counterID;
        displayDiv.textContent = `Sources Count -> Used: ${usedSourcesCount}, Not Used: ${unusedSourcesCount}`;
        
        // Add research websites count if any
        if (thinkingPanel) {
            // Set up observer for thinking panel
            setupThinkingPanelObserver(thinkingPanel);
            
            // Process initial research websites
            researchWebsitesCount = processResearchWebsites(thinkingPanel, displayDiv);
            
            if (researchWebsitesCount > 0) {
                displayDiv.textContent += `, Research Websites: ${researchWebsitesCount}`;
            }
        }
        
        displayDiv.style.fontWeight = 'bold';
        displayDiv.style.padding = '8px 16px 4px 24px';
        displayDiv.style.fontSize = '0.9em';
        displayDiv.style.color = 'var(--mat-sidenav-content-text-color, #3c4043)';
        displayDiv.style.borderBottom = '1px solid var(--mat-divider-color, #dadce0)';
        displayDiv.style.marginBottom = '8px';

        if (insertionPoint.firstChild) {
            insertionPoint.insertBefore(displayDiv, insertionPoint.firstChild);
        } else {
            insertionPoint.appendChild(displayDiv);
        }

        // Mark as processed
        responseContainer.setAttribute(PROCESSED_ATTR, 'true');
        console.log(`Gemini Source Counter: Processed container ${containerId}`);
        
        return true;
    }
    
    // --- Process extended response panel (active research) ---
    function processActiveResearch(extendedPanel) {
        if (!extendedPanel || extendedPanel.hasAttribute(RESEARCH_IN_PROGRESS_ATTR)) {
            return false;
        }
        
        const thinkingPanel = extendedPanel.querySelector(thinkingPanelSelector);
        if (!thinkingPanel) {
            return false;
        }
        
        // Create counter display
        const displayDiv = createActiveResearchCounter(extendedPanel);
        if (!displayDiv) {
            return false;
        }
        
        // Set up observer for thinking panel
        setupThinkingPanelObserver(thinkingPanel);
        
        // Process initial research websites
        const researchWebsitesCount = processResearchWebsites(thinkingPanel, displayDiv);
        displayDiv.textContent = `Research in progress: ${researchWebsitesCount} websites visited`;
        
        console.log(`Gemini Source Counter: Processed active research panel`);
        return true;
    }

    // --- Process deep research immersive panel ---
    function processDeepResearchPanel(panel) {
        // Skip if already processed
        if (panel.hasAttribute(PROCESSED_ATTR)) {
            return false;
        }

        // Generate a unique ID for this panel
        const panelId = panel.id || 
            `deep-research-${Math.random().toString(36).substring(2, 9)}`;
        if (!panel.id) {
            panel.id = panelId;
        }
        
        const counterID = `${COUNTER_ID_PREFIX}${panelId}`;
        
        // Check if counter already exists for this panel
        if (document.getElementById(counterID)) {
            return false;
        }

        const thinkingPanel = panel.querySelector(thinkingPanelSelector);
        if (!thinkingPanel) {
            return false;
        }

        // --- Create counter display for deep research ---
        const displayDiv = document.createElement('div');
        displayDiv.id = counterID;
        displayDiv.textContent = `Research in progress: 0 websites visited`;
        displayDiv.style.fontWeight = 'bold';
        displayDiv.style.padding = '8px 16px 4px 24px';
        displayDiv.style.fontSize = '0.9em';
        displayDiv.style.color = 'var(--mat-sidenav-content-text-color, #3c4043)';
        displayDiv.style.borderBottom = '1px solid var(--mat-divider-color, #dadce0)';
        displayDiv.style.marginBottom = '8px';
        
        // Find insertion point - try different options for different panel structures
        const toolbar = panel.querySelector('toolbar');
        const header = panel.querySelector('header') || panel.querySelector('.header');
        const researchContent = panel.querySelector('.research-content');
        
        if (toolbar) {
            toolbar.insertAdjacentElement('afterend', displayDiv);
            console.log(`Gemini Source Counter: Created deep research counter after toolbar for ${panelId}`);
        } else if (header) {
            header.insertAdjacentElement('afterend', displayDiv);
            console.log(`Gemini Source Counter: Created deep research counter after header for ${panelId}`);
        } else if (researchContent) {
            researchContent.insertAdjacentElement('afterbegin', displayDiv);
            console.log(`Gemini Source Counter: Created deep research counter at start of research content for ${panelId}`);
        } else {
            // Fallback insertion directly into the panel
            panel.insertAdjacentElement('afterbegin', displayDiv);
            console.log(`Gemini Source Counter: Created deep research counter (fallback method) for ${panelId}`);
        }
        
        // Set up observer for thinking panel
        setupThinkingPanelObserver(thinkingPanel);
        
        // Process initial research websites
        const researchWebsitesCount = processResearchWebsites(thinkingPanel, displayDiv);
        displayDiv.textContent = `Research in progress: ${researchWebsitesCount} websites visited`;
        
        // Mark as processed
        panel.setAttribute(RESEARCH_IN_PROGRESS_ATTR, 'true');
        panel.setAttribute(PROCESSED_ATTR, 'true');
        console.log(`Gemini Source Counter: Processed deep research panel ${panelId}`);
        
        return true;
    }

    // --- Main function to scan for and process all response containers ---
    function scanAndProcessResponses() {
        let processedAny = false;
        
        // Check for active research panels first
        const activeResearchPanels = document.querySelectorAll(extendedResponsePanelSelector);
        debugLog(`Found ${activeResearchPanels.length} active research panels`);
        activeResearchPanels.forEach(panel => {
            debugLog("Processing active research panel", panel);
            if (processActiveResearch(panel)) {
                processedAny = true;
            }
        });
        
        // Check for the new deep research immersive panels
        const deepResearchPanels = document.querySelectorAll(deepResearchPanelSelector);
        debugLog(`Found ${deepResearchPanels.length} deep research immersive panels`);
        deepResearchPanels.forEach(panel => {
            debugLog("Processing deep research immersive panel", panel);
            if (processDeepResearchPanel(panel)) {
                processedAny = true;
            }
        });
        
        // Then process regular response containers
        const responseContainers = document.querySelectorAll(overallResponseParentSelector);
        debugLog(`Found ${responseContainers.length} regular response containers`);
        
        if (responseContainers.length === 0 && deepResearchPanels.length === 0 && !processedAny) {
            debugLog("No containers found to process");
            return false;
        }
        
        // Process each container
        responseContainers.forEach(container => {
            debugLog("Processing regular response container", container);
            if (processResponseContainer(container)) {
                processedAny = true;
            }
        });
        
        return processedAny;
    }

    // --- Use MutationObserver ---
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    // Add a debounce mechanism to avoid excessive processing
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    const debouncedScan = debounce(() => {
        scanAndProcessResponses();
    }, 300); // Wait 300ms before processing changes
    
    const callback = function(mutationsList, obs) {
        let shouldProcess = false;
        
        // Check if mutations include relevant elements before scanning
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                // Look for our target elements in added nodes
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (
                            node.matches?.(deepResearchPanelSelector) || 
                            node.matches?.(extendedResponsePanelSelector) || 
                            node.matches?.(overallResponseParentSelector) ||
                            node.matches?.(thinkingPanelSelector) ||
                            node.querySelector?.(deepResearchPanelSelector) ||
                            node.querySelector?.(extendedResponsePanelSelector) ||
                            node.querySelector?.(overallResponseParentSelector) ||
                            node.querySelector?.(thinkingPanelSelector) ||
                            node.querySelector?.(sourceListContainerSelector) ||
                            node.querySelector?.(researchWebsitesContainerSelector)
                        ) {
                            shouldProcess = true;
                            break;
                        }
                    }
                }
            }
            
            if (shouldProcess) {
                break;
            }
        }
        
        // Only trigger scan if we found relevant elements
        if (shouldProcess) {
            debugLog("Detected relevant DOM changes, scheduling scan");
            debouncedScan();
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
    console.log("Gemini Source Counter: MutationObserver started.");
    
    // Initial scan in case elements already exist when script loads
    scanAndProcessResponses();
})();
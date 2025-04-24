// ==UserScript==
// @name         Gemini Deep Research Source Counter
// @namespace    http://tampermonkey.net/
// @version      0.6.1
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

    console.log("Gemini Source Counter: Script loaded. Version 0.6.1");

    // --- Selectors ---
    const overallResponseParentSelector = 'response-container';
    const sourceListContainerSelector = 'deep-research-source-lists';
    const usedSourcesListSelector = 'div.source-list.used-sources';
    const unusedSourcesListSelector = 'div.source-list.unused-sources';
    const sourceListItemSelector = 'browse-item';
    const insertionPointSelector = '.response-container-content';
    
    // New selectors for research websites in thinking panel
    const thinkingPanelSelector = 'thinking-panel';
    const researchWebsitesContainerSelector = '.browse-container';
    const researchWebsitesItemSelector = 'browse-web-chip';
    const researchWebsitesItemContentSelector = '.browse-chip';
    
    // Active research panel selector
    const extendedResponsePanelSelector = 'extended-response-panel';
    
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
        
        // Find toolbar to insert after
        const toolbar = responsePanel.querySelector('toolbar');
        if (toolbar) {
            toolbar.insertAdjacentElement('afterend', displayDiv);
            console.log(`Gemini Source Counter: Created active research counter for ${containerId}`);
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
                    // Find the inner browse-chip element
                    const contentElement = item.querySelector(researchWebsitesItemContentSelector);
                    if (!contentElement) return;
                    
                    // Skip if already has number
                    if (item.querySelector(`.${NUMBER_CLASS}`)) return;
                    
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
                                container.closest(extendedResponsePanelSelector);
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
                              thinkingPanel.closest(extendedResponsePanelSelector);
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

        const sourceListContainer = responseContainer.querySelector(sourceListContainerSelector);
        if (!sourceListContainer) {
            // This response doesn't have sources, might not be deep research
            // But still check for thinking panel in case research is in progress
            const thinkingPanel = responseContainer.querySelector(thinkingPanelSelector);
            if (!thinkingPanel) {
                return false;
            }
        }

        const insertionPoint = responseContainer.querySelector(insertionPointSelector);
        if (!insertionPoint) {
            return false;
        }

        // --- Count Sources and Add Numbers ---
        let usedSourcesCount = 0;
        const usedSourcesList = sourceListContainer ? sourceListContainer.querySelector(usedSourcesListSelector) : null;
        if (usedSourcesList) {
            const usedItems = usedSourcesList.querySelectorAll(sourceListItemSelector);
            usedSourcesCount = usedItems.length;
            console.log(`Gemini Source Counter: Found ${usedSourcesCount} used sources in ${containerId}.`);

            // Number used sources if not already numbered
            if (usedItems.length > 0) {
                const firstItemFirstChild = usedItems[0].firstChild;
                if (!(firstItemFirstChild && firstItemFirstChild.nodeType === Node.ELEMENT_NODE && firstItemFirstChild.classList.contains(NUMBER_CLASS))) {
                    console.log(`Gemini Source Counter: Numbering ${usedItems.length} used items.`);
                    usedItems.forEach((item, index) => {
                        const numberSpan = document.createElement('span');
                        numberSpan.className = NUMBER_CLASS;
                        numberSpan.textContent = `${index + 1}. `;
                        numberSpan.style.fontWeight = 'bold';
                        numberSpan.style.marginRight = '5px';
                        item.insertBefore(numberSpan, item.firstChild);
                    });
                }
            }
        }

        let unusedSourcesCount = 0;
        const unusedSourcesList = sourceListContainer ? sourceListContainer.querySelector(unusedSourcesListSelector) : null;
        if (unusedSourcesList) {
            const unusedItems = unusedSourcesList.querySelectorAll(sourceListItemSelector);
            unusedSourcesCount = unusedItems.length;
            console.log(`Gemini Source Counter: Found ${unusedSourcesCount} unused sources in ${containerId}.`);

            // Number unused sources if not already numbered
            if (unusedItems.length > 0) {
                const firstItemFirstChild = unusedItems[0].firstChild;
                if (!(firstItemFirstChild && firstItemFirstChild.nodeType === Node.ELEMENT_NODE && firstItemFirstChild.classList.contains(NUMBER_CLASS))) {
                    console.log(`Gemini Source Counter: Numbering ${unusedItems.length} unused items.`);
                    unusedItems.forEach((item, index) => {
                        const numberSpan = document.createElement('span');
                        numberSpan.className = NUMBER_CLASS;
                        numberSpan.textContent = `${index + 1}. `;
                        numberSpan.style.fontWeight = 'bold';
                        numberSpan.style.marginRight = '5px';
                        item.insertBefore(numberSpan, item.firstChild);
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

    // --- Main function to scan for and process all response containers ---
    function scanAndProcessResponses() {
        let processedAny = false;
        
        // Check for active research panels first
        const activeResearchPanels = document.querySelectorAll(extendedResponsePanelSelector);
        activeResearchPanels.forEach(panel => {
            if (processActiveResearch(panel)) {
                processedAny = true;
            }
        });
        
        // Then process regular response containers
        const responseContainers = document.querySelectorAll(overallResponseParentSelector);
        
        if (responseContainers.length === 0 && !processedAny) {
            return false;
        }
        
        // Process each container
        responseContainers.forEach(container => {
            if (processResponseContainer(container)) {
                processedAny = true;
            }
        });
        
        return processedAny;
    }

    // --- Use MutationObserver ---
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const callback = function(mutationsList, obs) {
        // Check for new responses on DOM changes
        scanAndProcessResponses();
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
    console.log("Gemini Source Counter: MutationObserver started.");
    
    // Initial scan in case elements already exist when script loads
    scanAndProcessResponses();
})();
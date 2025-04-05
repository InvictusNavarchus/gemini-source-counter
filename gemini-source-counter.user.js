// ==UserScript==
// @name         Gemini Deep Research Source Counter
// @namespace    http://tampermonkey.net/
// @version      0.5.0
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

    console.log("Gemini Source Counter: Script loaded. Version 0.5.0");

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
    const researchWebsitesItemSelector = 'browse-chip';

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
            return false;
        }

        const insertionPoint = responseContainer.querySelector(insertionPointSelector);
        if (!insertionPoint) {
            return false;
        }

        // --- Count Sources and Add Numbers ---
        let usedSourcesCount = 0;
        const usedSourcesList = sourceListContainer.querySelector(usedSourcesListSelector);
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
        const unusedSourcesList = sourceListContainer.querySelector(unusedSourcesListSelector);
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
        
        if (thinkingPanel) {
            const researchContainers = thinkingPanel.querySelectorAll(researchWebsitesContainerSelector);
            
            researchContainers.forEach(container => {
                const researchItems = container.querySelectorAll(researchWebsitesItemSelector);
                researchWebsitesCount += researchItems.length;
                
                // Number research websites if not already numbered
                if (researchItems.length > 0) {
                    const firstItemFirstChild = researchItems[0].firstChild;
                    if (!(firstItemFirstChild && firstItemFirstChild.nodeType === Node.ELEMENT_NODE && firstItemFirstChild.classList.contains(NUMBER_CLASS))) {
                        console.log(`Gemini Source Counter: Numbering ${researchItems.length} research websites.`);
                        researchItems.forEach((item, index) => {
                            const numberSpan = document.createElement('span');
                            numberSpan.className = NUMBER_CLASS;
                            numberSpan.textContent = `${index + 1}. `;
                            numberSpan.style.fontWeight = 'bold';
                            numberSpan.style.marginRight = '5px';
                            numberSpan.style.position = 'absolute';
                            numberSpan.style.left = '3px';
                            numberSpan.style.top = '50%';
                            numberSpan.style.transform = 'translateY(-50%)';
                            item.style.position = 'relative';
                            item.style.paddingLeft = '25px';
                            item.insertBefore(numberSpan, item.firstChild);
                        });
                    }
                }
            });
            
            console.log(`Gemini Source Counter: Found ${researchWebsitesCount} research websites in ${containerId}.`);
        }

        // --- Create and Insert Display Element ---
        const displayDiv = document.createElement('div');
        displayDiv.id = counterID;
        displayDiv.textContent = `Sources Count -> Used: ${usedSourcesCount}, Not Used: ${unusedSourcesCount}`;
        
        // Add research websites count if any
        if (researchWebsitesCount > 0) {
            displayDiv.textContent += `, Research Websites: ${researchWebsitesCount}`;
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

    // --- Main function to scan for and process all response containers ---
    function scanAndProcessResponses() {
        let processedAny = false;
        
        const responseContainers = document.querySelectorAll(overallResponseParentSelector);
        
        if (responseContainers.length === 0) {
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
// ==UserScript==
// @name         Gemini Deep Research Source Counter
// @namespace    http://tampermonkey.net/
// @version      0.2.0
// @description  Counts used and unused sources on Gemini deep research results and displays the count at the top. Also numbers each source item. (Minimal change version)
// @author       Your Name Here (or Gemini)
// @match        https://gemini.google.com/app/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const COUNTER_ID = 'gemini-source-counter-display';
    const NUMBER_CLASS = 'gemini-source-item-number'; // Class to identify added numbers
    const MAX_TRIES = 60; // Try for ~30 seconds (60 * 500ms)
    let tries = 0;

    console.log("Gemini Source Counter: Script loaded."); // Version updated in log

    // --- Selectors ---
    const overallResponseParentSelector = 'response-container';
    const sourceListContainerSelector = 'deep-research-source-lists';
    const usedSourcesListSelector = 'div.source-list.used-sources';
    const unusedSourcesListSelector = 'div.source-list.unused-sources';
    const sourceListItemSelector = 'browse-item';
    const insertionPointSelector = '.response-container-content';

    // --- Main Function (Kept original name 'addSourceCounts') ---
    function addSourceCounts() {
        tries++;
        console.log(`Gemini Source Counter: Attempt ${tries}/${MAX_TRIES}`); // Version updated in log

        // Check if the counter already exists
        if (document.getElementById(COUNTER_ID)) {
            console.log("Gemini Source Counter: Counter already exists.");
            return true;
        }

        const overallParent = document.querySelector(overallResponseParentSelector);
        if (!overallParent) {
             console.log("Gemini Source Counter: Overall response parent container not found yet.");
             return false;
        }

        const sourceListContainer = overallParent.querySelector(sourceListContainerSelector);
        if (!sourceListContainer) {
            if (tries > 10) console.log("Gemini Source Counter: Source list container not found within parent (might not be deep research?).");
            else console.log("Gemini Source Counter: Source list container not found within parent yet.");
            return false;
        }

        const insertionPoint = overallParent.querySelector(insertionPointSelector);
         if (!insertionPoint) {
            console.log("Gemini Source Counter: Insertion point not found within parent yet.");
            return false;
        }

        // --- Count Sources and Add Numbers ---
        let usedSourcesCount = 0;
        const usedSourcesList = sourceListContainer.querySelector(usedSourcesListSelector);
        if (usedSourcesList) {
            const usedItems = usedSourcesList.querySelectorAll(sourceListItemSelector);
            usedSourcesCount = usedItems.length;
            console.log(`Gemini Source Counter: Found ${usedSourcesCount} used sources.`);

            // --- Start: ADDED NUMBERING LOGIC for used list ---
            if (usedItems.length > 0) {
                const firstItemFirstChild = usedItems[0].firstChild;
                if (!(firstItemFirstChild && firstItemFirstChild.nodeType === Node.ELEMENT_NODE && firstItemFirstChild.classList.contains(NUMBER_CLASS))) {
                    console.log(`Gemini Source Counter: Numbering ${usedItems.length} used items.`); // Added log for numbering action
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
            // --- End: ADDED NUMBERING LOGIC ---

        } else {
            console.log("Gemini Source Counter: Used sources list div not found.");
        }

        let unusedSourcesCount = 0;
        const unusedSourcesList = sourceListContainer.querySelector(unusedSourcesListSelector);
        if (unusedSourcesList) {
            const unusedItems = unusedSourcesList.querySelectorAll(sourceListItemSelector);
            unusedSourcesCount = unusedItems.length;
             console.log(`Gemini Source Counter: Found ${unusedSourcesCount} unused sources.`);

            // --- Start: ADDED NUMBERING LOGIC for unused list ---
            if (unusedItems.length > 0) {
                 const firstItemFirstChild = unusedItems[0].firstChild;
                 if (!(firstItemFirstChild && firstItemFirstChild.nodeType === Node.ELEMENT_NODE && firstItemFirstChild.classList.contains(NUMBER_CLASS))) {
                    console.log(`Gemini Source Counter: Numbering ${unusedItems.length} unused items.`); // Added log for numbering action
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
             // --- End: ADDED NUMBERING LOGIC ---

        } else {
             console.log("Gemini Source Counter: Unused sources list div not found.");
        }

        if (!usedSourcesList && !unusedSourcesList) {
             console.log("Gemini Source Counter: Neither specific source list found inside container. Structure might have changed.");
        }

        // --- Create and Insert Display Element ---
        const displayDiv = document.createElement('div');
        displayDiv.id = COUNTER_ID;
        displayDiv.textContent = `Sources Count -> Used: ${usedSourcesCount}, Not Used: ${unusedSourcesCount}`;
        displayDiv.style.fontWeight = 'bold';
        displayDiv.style.padding = '8px 16px 4px 24px';
        displayDiv.style.fontSize = '0.9em';
        displayDiv.style.color = 'var(--mat-sidenav-content-text-color, #3c4043)';
        displayDiv.style.borderBottom = '1px solid var(--mat-divider-color, #dadce0)';
        displayDiv.style.marginBottom = '8px';

        if (insertionPoint.firstChild) {
            insertionPoint.insertBefore(displayDiv, insertionPoint.firstChild);
            console.log("Gemini Source Counter: Counter display inserted.");
        } else {
            insertionPoint.appendChild(displayDiv);
             console.log("Gemini Source Counter: Counter display appended (insertion point had no children).");
        }

        return true; // Indicate success
    }

    // --- Use MutationObserver ---
    let observer = null;
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const callback = function(mutationsList, obs) {
         // Check if the elements exist now
         if (addSourceCounts()) { // Function name kept as addSourceCounts
             console.log("Gemini Source Counter: Elements found via MutationObserver. Stopping observer.");
             if (observer) observer.disconnect();
             if (checkInterval) clearInterval(checkInterval);
         }
    };

    observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
    console.log("Gemini Source Counter: MutationObserver started.");


    // --- Fallback Interval Timer ---
    const checkInterval = setInterval(() => {
        if (tries >= MAX_TRIES) {
             clearInterval(checkInterval);
             if (observer) observer.disconnect();
             if (!document.getElementById(COUNTER_ID)) {
                 console.log("Gemini Source Counter: Timed out waiting for elements.");
             }
        } else if (addSourceCounts()) { // Try adding counts and numbers on interval (Function name kept)
             clearInterval(checkInterval);
             if (observer) observer.disconnect();
             console.log("Gemini Source Counter: Elements found via Interval. Stopping checks.");
        }
    }, 500);

})();
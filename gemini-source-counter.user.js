// ==UserScript==
// @name         Gemini Deep Research Source Counter
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Counts used and unused sources on Gemini deep research results and displays the count at the top.
// @author       Your Name Here (or Gemini)
// @match        https://gemini.google.com/app/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const COUNTER_ID = 'gemini-source-counter-display';
    const MAX_TRIES = 40; // Try for ~20 seconds (40 * 500ms)
    let tries = 0;

    console.log("Gemini Source Counter: Script loaded.");

    // Selectors based on the provided HTML structure
    const usedSourcesButtonSelector = 'button[data-test-id="used-sources-button"]';
    const unusedSourcesButtonSelector = 'button[data-test-id="unused-sources-button"]';
    const sourceListItemSelector = 'browse-item'; // The component tag for each source link
    const insertionPointSelector = '.response-container-content'; // Place it inside the main content area, before the message
    const sourceListContainerSelector = 'deep-research-source-lists'; // The parent component holding both lists

    function addSourceCounts() {
        tries++;
        console.log(`Gemini Source Counter: Attempt ${tries}/${MAX_TRIES}`);

        // Check if the counter already exists (e.g., from a previous run on dynamic content update)
        if (document.getElementById(COUNTER_ID)) {
            console.log("Gemini Source Counter: Counter already exists.");
            return true; // Indicate success or already done
        }

        // Find the main container for the source lists
        const sourceListContainer = document.querySelector(sourceListContainerSelector);
        if (!sourceListContainer) {
            console.log("Gemini Source Counter: Source list container not found yet.");
            return false; // Indicate failure, try again
        }

        // Find the insertion point
        const insertionPoint = sourceListContainer.closest('response-container')?.querySelector(insertionPointSelector);
         if (!insertionPoint) {
            console.log("Gemini Source Counter: Insertion point not found yet.");
            return false; // Indicate failure, try again
        }

        // --- Count Used Sources ---
        // The used sources list is the first div.source-list directly after the used-sources-button's parent
        const usedSourcesButton = sourceListContainer.querySelector(usedSourcesButtonSelector);
        let usedSourcesCount = 0;
        if (usedSourcesButton) {
             // Find the div following the button's collapsible-button parent
            const usedSourcesListDiv = usedSourcesButton.closest('collapsible-button')?.nextElementSibling;
            if (usedSourcesListDiv && usedSourcesListDiv.classList.contains('used-sources')) {
                 usedSourcesCount = usedSourcesListDiv.querySelectorAll(sourceListItemSelector).length;
                 console.log(`Gemini Source Counter: Found ${usedSourcesCount} used sources.`);
            } else {
                 console.log("Gemini Source Counter: Used sources list div not found or structure changed.");
            }
        } else {
            console.log("Gemini Source Counter: Used sources button not found.");
            // Assume 0 if button isn't there, might not be a deep research result yet
        }


        // --- Count Unused Sources ---
        // The unused sources list is the first div.source-list directly after the unused-sources-button's parent
        const unusedSourcesButton = sourceListContainer.querySelector(unusedSourcesButtonSelector);
        let unusedSourcesCount = 0;
        if (unusedSourcesButton) {
             // Find the div following the button's collapsible-button parent
            const unusedSourcesListDiv = unusedSourcesButton.closest('collapsible-button')?.nextElementSibling;
            if (unusedSourcesListDiv && unusedSourcesListDiv.classList.contains('unused-sources')) {
                 unusedSourcesCount = unusedSourcesListDiv.querySelectorAll(sourceListItemSelector).length;
                 console.log(`Gemini Source Counter: Found ${unusedSourcesCount} unused sources.`);
            } else {
                 console.log("Gemini Source Counter: Unused sources list div not found or structure changed.");
            }
        } else {
             console.log("Gemini Source Counter: Unused sources button not found.");
            // Assume 0 if button isn't there
        }

         // Only proceed if at least one source list seems to be present (button found)
        if (!usedSourcesButton && !unusedSourcesButton) {
             console.log("Gemini Source Counter: Neither source button found. Not adding counter.");
             return false; // Probably not the right page state yet
        }


        // --- Create and Insert Display Element ---
        const displayDiv = document.createElement('div');
        displayDiv.id = COUNTER_ID;
        displayDiv.textContent = `Sources Count -> Used: ${usedSourcesCount}, Not Used: ${unusedSourcesCount}`;
        displayDiv.style.fontWeight = 'bold';
        displayDiv.style.padding = '8px 16px 4px 24px'; // Adjust padding as needed
        displayDiv.style.fontSize = '0.9em';
        displayDiv.style.color = 'var(--mat-sidenav-content-text-color, #3c4043)'; // Try to use theme color
        displayDiv.style.borderBottom = '1px solid var(--mat-divider-color, #dadce0)'; // Add a separator
        displayDiv.style.marginBottom = '8px';


        // Insert before the first child of the insertion point
        if (insertionPoint.firstChild) {
            insertionPoint.insertBefore(displayDiv, insertionPoint.firstChild);
            console.log("Gemini Source Counter: Counter display inserted.");
        } else {
            insertionPoint.appendChild(displayDiv); // Fallback if no children
             console.log("Gemini Source Counter: Counter display appended (insertion point had no children).");
        }


        return true; // Indicate success
    }

    // Use an interval to check periodically, as Gemini loads content dynamically
    const checkInterval = setInterval(() => {
        if (addSourceCounts() || tries >= MAX_TRIES) {
            clearInterval(checkInterval);
            if (tries >= MAX_TRIES && !document.getElementById(COUNTER_ID)) {
                 console.log("Gemini Source Counter: Timed out waiting for elements.");
            } else if(tries < MAX_TRIES) {
                 console.log("Gemini Source Counter: Check complete.");
            }
        }
    }, 500); // Check every 500ms

})();
// ==UserScript==
// @name         Gemini Deep Research Source Counter
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Counts used and unused sources on Gemini deep research results and displays the count at the top.
// @author       Your Name Here (or Gemini)
// @match        https://gemini.google.com/app/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const COUNTER_ID = 'gemini-source-counter-display';
    const MAX_TRIES = 60; // Try for ~30 seconds (60 * 500ms) - Increased timeout
    let tries = 0;

    console.log("Gemini Source Counter v1.2: Script loaded.");

    // --- Selectors ---
    // We need a reliable parent container for the response *and* the sources
    const overallResponseParentSelector = 'response-container'; // This component seems to wrap the result and sources
    // Selectors within the overall parent
    const sourceListContainerSelector = 'deep-research-source-lists';
    const usedSourcesListSelector = 'div.source-list.used-sources'; // Direct selector for the list div
    const unusedSourcesListSelector = 'div.source-list.unused-sources'; // Direct selector for the list div
    const sourceListItemSelector = 'browse-item';
    const insertionPointSelector = '.response-container-content'; // Where to put the counter

    function addSourceCounts() {
        tries++;
        console.log(`Gemini Source Counter v1.2: Attempt ${tries}/${MAX_TRIES}`);

        // Check if the counter already exists
        if (document.getElementById(COUNTER_ID)) {
            console.log("Gemini Source Counter v1.2: Counter already exists.");
            return true;
        }

        // Find the overall container that should hold both the response and the sources
        const overallParent = document.querySelector(overallResponseParentSelector);
        if (!overallParent) {
             console.log("Gemini Source Counter v1.2: Overall response parent container not found yet.");
             return false;
        }

        // Now look for the source list container *within* the overall parent
        const sourceListContainer = overallParent.querySelector(sourceListContainerSelector);
        if (!sourceListContainer) {
            // If this specific container isn't found after a few seconds, maybe it's not a deep research result page
            if (tries > 10) console.log("Gemini Source Counter v1.2: Source list container not found within parent (might not be deep research?).");
            else console.log("Gemini Source Counter v1.2: Source list container not found within parent yet.");
            return false;
        }

        // Look for the insertion point *within* the overall parent
        const insertionPoint = overallParent.querySelector(insertionPointSelector);
         if (!insertionPoint) {
            console.log("Gemini Source Counter v1.2: Insertion point not found within parent yet.");
            return false;
        }

        // --- Count Sources Directly ---
        let usedSourcesCount = 0;
        const usedSourcesList = sourceListContainer.querySelector(usedSourcesListSelector);
        if (usedSourcesList) {
            usedSourcesCount = usedSourcesList.querySelectorAll(sourceListItemSelector).length;
            console.log(`Gemini Source Counter v1.2: Found ${usedSourcesCount} used sources.`);
        } else {
            console.log("Gemini Source Counter v1.2: Used sources list div not found.");
            // It's okay if one list is missing, count remains 0
        }

        let unusedSourcesCount = 0;
        const unusedSourcesList = sourceListContainer.querySelector(unusedSourcesListSelector);
        if (unusedSourcesList) {
            unusedSourcesCount = unusedSourcesList.querySelectorAll(sourceListItemSelector).length;
             console.log(`Gemini Source Counter v1.2: Found ${unusedSourcesCount} unused sources.`);
        } else {
             console.log("Gemini Source Counter v1.2: Unused sources list div not found.");
             // Count remains 0
        }

        // If both lists are reported as not found, maybe the structure inside sourceListContainer changed
        if (!usedSourcesList && !unusedSourcesList) {
             console.log("Gemini Source Counter v1.2: Neither specific source list found inside container. Structure might have changed.");
             // We could still potentially add a counter showing 0/0 if needed, but let's assume structure changed or not ready.
             // return false; // Optional: Uncomment to prevent adding counter if lists aren't found
        }


        // --- Create and Insert Display Element ---
        const displayDiv = document.createElement('div');
        displayDiv.id = COUNTER_ID;
        displayDiv.textContent = `Sources Count -> Used: ${usedSourcesCount}, Not Used: ${unusedSourcesCount}`;
        // Apply styling (same as before)
        displayDiv.style.fontWeight = 'bold';
        displayDiv.style.padding = '8px 16px 4px 24px';
        displayDiv.style.fontSize = '0.9em';
        displayDiv.style.color = 'var(--mat-sidenav-content-text-color, #3c4043)';
        displayDiv.style.borderBottom = '1px solid var(--mat-divider-color, #dadce0)';
        displayDiv.style.marginBottom = '8px';

        // Insert before the first child of the insertion point
        if (insertionPoint.firstChild) {
            insertionPoint.insertBefore(displayDiv, insertionPoint.firstChild);
            console.log("Gemini Source Counter v1.2: Counter display inserted.");
        } else {
            insertionPoint.appendChild(displayDiv);
             console.log("Gemini Source Counter v1.2: Counter display appended (insertion point had no children).");
        }

        return true; // Indicate success
    }

    // --- Use MutationObserver for potentially better detection ---
    let observer = null;
    const targetNode = document.body; // Observe the whole body for changes
    const config = { childList: true, subtree: true };

    const callback = function(mutationsList, obs) {
        // Check if the elements exist now
         if (addSourceCounts()) {
             console.log("Gemini Source Counter v1.2: Elements found via MutationObserver. Stopping observer.");
             if (observer) observer.disconnect(); // Stop observing once we succeed
             if (checkInterval) clearInterval(checkInterval); // Clear interval if observer succeeds first
         }
    };

    observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
    console.log("Gemini Source Counter v1.2: MutationObserver started.");


    // --- Fallback Interval Timer ---
    // Still use interval as a fallback or if observer fails for some reason
    const checkInterval = setInterval(() => {
        if (tries >= MAX_TRIES) {
             clearInterval(checkInterval);
             if (observer) observer.disconnect(); // Stop observer on timeout too
             if (!document.getElementById(COUNTER_ID)) {
                 console.log("Gemini Source Counter v1.2: Timed out waiting for elements.");
             }
        } else if (addSourceCounts()) { // Try adding counts on interval
             clearInterval(checkInterval); // Stop interval if successful
             if (observer) observer.disconnect(); // Stop observer if interval succeeds first
             console.log("Gemini Source Counter v1.2: Elements found via Interval. Stopping checks.");
        }
    }, 500); // Check every 500ms

})();
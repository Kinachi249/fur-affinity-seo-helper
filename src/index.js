import { initializeSeoHelper } from './features/seo-helper/entry.js'

function initializeFeatures(result) {
    initializeSeoHelper();
}

function onError(error) {
    console.log(`Error setting up SEO helper: ${error}`);
}

initializeFeatures()
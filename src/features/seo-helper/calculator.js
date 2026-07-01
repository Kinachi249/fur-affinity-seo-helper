const INDEXED_SUBMISSION_COUNT_ESTIMATE = 37000000;
// FA+ users can go higher, but this applies for all users.
const PAGE_SIZE = 72;

export async function calculateRankingValue(searchQuery) {
    const submissionTitle = document.querySelector("input#title").value
    const submissionDescription = document.querySelector("textarea#message").value
    const submissionKeywords = document.querySelector("textarea#keywords").value
    const submissionFilename =
        document.querySelector("div.c-uploadDetails__previewBody img")
            .getAttribute("src")
            .replaceAll(/[_\.]+/g, " ")

    const cleanQuery = searchQuery.replaceAll(".", "\\.")

    const keywordScore = getLcsValue(cleanQuery, submissionKeywords, 4000)
    const titleScore = getLcsValue(cleanQuery, submissionTitle, 3000)
    const descriptionScore = getLcsValue(cleanQuery, submissionDescription, 2000)
    const filenameScore = getLcsValue(cleanQuery, submissionFilename, 1000)

    const baseScore = keywordScore + titleScore + descriptionScore + filenameScore;

    const searchResults = await getActualSearchResult(searchQuery)
    const bm15Score = getBm15Value(searchQuery, searchResults, submissionTitle, submissionDescription, submissionKeywords, submissionFilename)

    const totalScore = baseScore + bm15Score;

    return await getTestResults(searchQuery, searchResults, totalScore)
}

/**
 * Get the finalized, weighted LCS value for the field.
 */
function getLcsValue(searchQuery, fieldValue, weight) {
    const splitQuery = searchQuery.replaceAll(/[^A-Za-z0-9_\s]/g, "").split(' ')
    const splitField = fieldValue.replaceAll(/[^A-Za-z0-9_\s]/g, "").split(' ')

    const lcsValue = lcsCalculation(splitQuery, splitField)

    return lcsValue * weight;
}

/**
 * Longest Common Subsequence
 * 
 * Sphinx uses a variation of this calculation that relies on word position relative to the query.
 * So, if you have a query of "hello there world", then the text "hello beautiful world" would have
 * an LCS of 2. However, the text "hello again beautiful world" would have an LCS of 1, because there are
 * two words separating "hello" and "world", but in the query they are only separated by one word.
 */
function lcsCalculation(queryWords, fieldWords) {
    const window = queryWords.length > fieldWords.length ? fieldWords : queryWords;
    const words = queryWords.length > fieldWords.length ? queryWords : fieldWords;

    const windowSize = window.length;
    let maxLcs = 0;
    let currentIndex = -windowSize + 1;
    while (currentIndex < words.length) {
      let currentLcs = 0;
      for (let i = 0; i < windowSize; i++) {
        if (currentIndex + i >= 0 && window[i] === words[currentIndex + i]) {
          currentLcs++;
        }
      }
      maxLcs = Math.max(maxLcs, currentLcs)
      currentIndex++;
    }

    return maxLcs;
}

/**
 * Sphinx's flavor of the BM15 calculation, which in of itself is a subset of the BM25 calculation.
 * 
 * Calculates the Term Frequency and Inverse Document Frequency, then uses the average of each term's result.
 */
function getBm15Value(searchQuery, searchResults, submissionTitle, submissionDescription, submissionKeywords, submissionFilename) {
    const searchTerms = searchQuery.replaceAll(/[^A-Za-z0-9_\s]/g, "").split(' ')

    let totalTfIdf = 0;
    searchTerms.forEach(term => {
        totalTfIdf += getTfIdfForTerm(term, searchResults, submissionTitle, submissionDescription, submissionKeywords, submissionFilename);
    });

    const averageResult = totalTfIdf / searchTerms.length;

    const initialResult = (averageResult + 0.5) * 1000
    return Math.floor(initialResult)
}

/**
 * Get the TF_IDF value for a single term.
 * 
 * This relies on an estimated INDEXED_SUBMISSION_COUNT_ESTIMATE. For FA, this seems to be somewhere in the ballpark
 * of 37 million submissions based on calculations. This number can vary though, so this is a (fairly close) approximation at best.
 */
function getTfIdfForTerm(term, searchResults, submissionTitle, submissionDescription, submissionKeywords, submissionFilename) {
    const termSubmissionCount = searchResults['resultsPerTerm'][term];
    const re = new RegExp(`\\b${term}\\b`, "gi");

    const titleCount = [...submissionTitle.matchAll(re)].length;
    const descriptionCount = [...submissionDescription.matchAll(re)].length;
    const keywordsCount = [...submissionKeywords.matchAll(re)].length;
    const filenameCount = [...submissionFilename.matchAll(re)].length;

    const termFreq = titleCount + descriptionCount + keywordsCount + filenameCount;

    const idf = (termFreq / (termFreq + 1.2));
    const tf = (Math.log((INDEXED_SUBMISSION_COUNT_ESTIMATE - termSubmissionCount + 1) / termSubmissionCount) / (2 * Math.log(INDEXED_SUBMISSION_COUNT_ESTIMATE + 1)));

    return tf * idf;
}

/**
 * Perform an actual search using the sample query, to get stats about the site-wide
 * term counts that will be used in the TF_IDF calculations.
 */
async function getActualSearchResult(searchQuery) {
    const searchUrl = `https://www.furaffinity.net/search/?q=${searchQuery}&order-by=relevancy&order-direction=desc&range=5years&rating-general=1&rating-mature=1&rating-adult=1&type-art=1&type-music=1&type-flash=1&type-story=1&type-photo=1&type-poetry=1&mode=extended`;

    const searchResultHtml = await fetch(searchUrl);
    const parseableElement = document.createElement('html');
    parseableElement.innerHTML = await searchResultHtml.text();

    const queryWords = searchQuery.split();
    const queryStatsContainer = parseableElement.querySelector("div#query-stats");

    const resultsPerTerm = [];

    for (const stat of queryStatsContainer.children) {
        const key = stat.querySelector("h3 > span").textContent;
        const value = stat.querySelectorAll("span")[1].textContent;
        resultsPerTerm[key] = +value;
    }

    const totalResultString = queryStatsContainer.textContent;
    const totalResultRegex = new RegExp("\\(1 - [0-9]+ of ([0-9]+)\\)");
    const totalResults = +totalResultString.match(totalResultRegex)[1];

    return {
        resultsPerTerm: resultsPerTerm,
        totalResults: totalResults
    };
}

/**
 * Perform additional searches, to get a list of existing search result scores.
 * This is so we know where the calculated ranking score will land in a live search.
 */
async function getAdditionalSearchResults(searchQuery, page) {
    const searchUrl = `https://www.furaffinity.net/search/?q=${searchQuery}&page=${page}&perpage=${PAGE_SIZE}&order-by=relevancy&order-direction=desc&range=5years&rating-general=1&rating-mature=1&rating-adult=1&type-art=1&type-music=1&type-flash=1&type-story=1&type-photo=1&type-poetry=1&mode=extended`;

    const searchResultHtml = await fetch(searchUrl);
    const parseableElement = document.createElement('html');
    parseableElement.innerHTML = await searchResultHtml.text();

    const submissionResultList = parseableElement.querySelector("section#gallery-search-results");
    const submissionScores = [];

    for (const submission of submissionResultList.children) {
        submissionScores.push(+submission.getAttribute("data-weight-base"));
    }

    return submissionScores;
}

/**
 * Given the test query, look up where the calculated ranking would end up in a live search.
 * Then, provide a summary of the test query's stats for display in the UI.
 */
async function getTestResults(searchQuery, searchResults, totalScore) {
    // If score is 500, no terms were matched and we already know this submission won't appear in a search.
    // So, skip searching if this is the case.
    if (totalScore > 500) {
        // Use a binary search to try and reduce required number of search page lookups.

        // FA limits searches to 5000 results
        const maxPages = Math.ceil(5000 / PAGE_SIZE);
        const totalPages = Math.min(maxPages, Math.ceil(searchResults['totalResults'] / PAGE_SIZE));
        let candidatePages = Array.from({length: totalPages}, (_, i) => i + 1);

        let searchPage = Math.floor(totalPages / 2);
        const pagesWithFirstResultMatch = [];

        let resultPosition = -1;
        let iterations = 0;
        
        while (resultPosition < 0 && candidatePages.length > 0) {
            const nextPage = await getAdditionalSearchResults(searchQuery, searchPage);
            resultPosition = nextPage.findIndex(score => totalScore > score);

            if (resultPosition < 0 && pagesWithFirstResultMatch.indexOf(searchPage + 1) !== -1) {
                resultPosition = 0;
                searchPage++;
            } else if (resultPosition === 0) {
                pagesWithFirstResultMatch.push(searchPage);
                resultPosition = -1;
                const currentPageIndex = candidatePages.indexOf(searchPage);
                candidatePages = candidatePages.slice(0, currentPageIndex);
                searchPage = candidatePages[Math.floor(candidatePages.length / 2)];
            } else if (resultPosition < 0) {
                const currentPageIndex = candidatePages.indexOf(searchPage);
                candidatePages = candidatePages.slice(currentPageIndex + 1);
                searchPage = candidatePages[Math.floor(candidatePages.length / 2)];
            }
            iterations++;

            await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    resultPosition = resultPosition === -1 ? -1 : (searchPage - 1) * PAGE_SIZE + resultPosition;

    return {
        totalScore: totalScore,
        position: resultPosition,
        totalResults: searchResults['totalResults']
    };
}
import { calculateRankingValue } from './calculator.js'

async function createSeoHelperSection() {
    const sectionContainer = document.createElement("section");

    const sectionHeader = document.createElement("div")
    sectionHeader.classList.add("section-header");
    const headerText = document.createElement("h2");
    headerText.textContent = "SEO Helper";
    sectionHeader.appendChild(headerText)

    const sectionBody = await createSeoHelperForm();

    sectionContainer.appendChild(sectionHeader);
    sectionContainer.appendChild(sectionBody);

    return sectionContainer;
}

async function createSeoHelperForm() {
    const sectionBody = document.createElement("div")
    sectionBody.classList.add("section-body")
    sectionBody.id = "seo-body";

    const testSearchField = document.createElement("div")
    testSearchField.classList.add("l-contentSection")
    const testSearchFieldLabel = document.createElement("h4")
    testSearchFieldLabel.textContent = "Test Search Query"
    const testSearchFieldInput = document.createElement("input")
    testSearchFieldInput.type = "text"
    testSearchFieldInput.classList.add("textbox")
    testSearchField.appendChild(testSearchFieldLabel)
    testSearchField.appendChild(testSearchFieldInput)

    const sectionOptions = document.createElement("div")
    sectionOptions.classList.add("section-options")
    const getSeoResultButton = document.createElement("button")
    getSeoResultButton.type = "button"
    getSeoResultButton.textContent = "Test search"
    getSeoResultButton.classList.add("button")
    getSeoResultButton.onclick = async () => performQueryTest(testSearchFieldInput.value)
    sectionOptions.appendChild(getSeoResultButton)

    sectionBody.appendChild(testSearchField)
    sectionBody.appendChild(sectionOptions)

    return sectionBody;
}

async function createResultsSection(queryTestResults) {
    const sectionBody = document.createElement("div")
    const submissionPosition = queryTestResults['position']
    const testScore = queryTestResults['totalScore']

    // 500 is the minimum score, and is not possible in a normal search.
    if (testScore === 500) {
        sectionBody.innerHTML = `Given the provided search query, your submission would not appear in the search results due to no matching terms.`
    } else if (submissionPosition === -1) {
        sectionBody.innerHTML = `When searching the provided query using relevancy, your submission would have a score of <strong>${queryTestResults['totalScore']}</strong>. However, this would NOT rank in the top 5000 results (Fur Affinity's current search result limit).`
    } else {
        sectionBody.innerHTML = `When searching the provided query using relevancy, your submission would have a score of <strong>${queryTestResults['totalScore']}</strong>, putting it at about position <strong>${queryTestResults['position']}/${queryTestResults['totalResults']}</strong> in the search results.`
    }

    return sectionBody;
}

async function addReportSectionsToPage(body) {
  if (!body) {
    return;
  }

  const seoHelperSection = await createSeoHelperSection()

  const finalizeSubmissionSection = body.querySelector("#site-content section.c-uploadDetails")

  finalizeSubmissionSection.insertAdjacentElement("afterend", seoHelperSection)
}

async function performQueryTest(testQuery) {
    const results = await calculateRankingValue(testQuery)
    const resultElement = await createResultsSection(results)
    resultElement.style.paddingTop = '8px';

    const seoBody = document.querySelector("div#seo-body > div")
    if (seoBody.childElementCount === 3) {
        seoBody.removeChild(seoBody.lastChild)
    }
    seoBody.appendChild(resultElement)
}

export async function initializeSeoHelper() {
    addReportSectionsToPage(document.querySelector("body"));
}
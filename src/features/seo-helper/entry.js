import { createResultsSection, createSeoHelperSection } from './element-creator.js'

export async function initializeSeoHelper() {
    if (window.location.href.startsWith('https://www.furaffinity.net/controls/submissions/changeinfo')) {
        addSeoHelperToEditPage(document.querySelector("body"));
    } else {
        addSeoHelperToUploadPage(document.querySelector("body"));
    }
}

async function addSeoHelperToUploadPage(body) {
  if (!body) {
    return;
  }

  const seoHelperSection = await createSeoHelperSection();

  const finalizeSubmissionSection = body.querySelector("#site-content section.c-uploadDetails");

  finalizeSubmissionSection.insertAdjacentElement("afterend", seoHelperSection);
}

async function addSeoHelperToEditPage(body) {
  if (!body) {
    return;
  }

  const seoHelperSection = await createSeoHelperSection();

  const finalizeSubmissionSection = body.querySelector("#site-content section.c-submissionDetails");

  finalizeSubmissionSection.insertAdjacentElement("afterend", seoHelperSection);
}
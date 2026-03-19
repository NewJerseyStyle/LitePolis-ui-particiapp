//
// Copyright (C) 2024 Guido Berhoerster <guido+particiapi@berhoerster.name>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//

import { marked } from "./marked.esm.js";
import * as particiapi from "./particiapi-client.js";

const POLL_INTERVAL_MIN = 8000;  // ms
const POLL_INTERVAL_MAX = 12000; // ms
const DEFAULT_TRANSLATIONS = {
    authenticationFailed: "An error occurred while logging in, please try again",
    pollingFailed: "An error occurred while checking for changes, please refresh your browser",
    votingFailed: "An error occurred while submitting your vote, please try again",
    changingNotificationsFailed: "An error occurred while processing your notification preference, please try again",
    statementFailed: "An error occurred while submitting your statement, please try again",
}

marked.use({
    html(html, block) {
      return "";
    },
    link(href, title, text) {
      let u;
      try {
          u = new URL(href, window.location);
      } catch(e) {
          return text;
      }
      if (!["http:", "https:"].includes(u.protocol)) {
          return text;
      }
      // use default renderer
      return false;
    },
    image(href, title, text) {
      return text;
    }
});

function getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}

export function showErrorModal(message, details = "") {
    const dialog = document.querySelector("#error-dialog");
    dialog.querySelector("#error-dialog-message").textContent = message;
    dialog.querySelector("#error-dialog-details").textContent = details;
    dialog.showModal();
}

export class ConversationApp {
    constructor(baseElement, baseURL, conversationID, translations = DEFAULT_TRANSLATIONS) {
        this.baseElement = baseElement;
        this.client = new particiapi.ConversationClient(baseURL, conversationID);
        this.translations = {...DEFAULT_TRANSLATIONS, ...translations};

        this.loginWindow = null;
        this.loginWindowTimer = null;
        this.pollTimer = null;
        this.loginButton = this.baseElement.querySelector("#login");
        this.statementTextArea = this.baseElement.querySelector("#statement-text");
        this.errorMessageTemplate = this.baseElement.querySelector("#error-message-template");
    }

    async init() {
        try {
            await this.client.init();
        } catch (error) {
            if (!(error instanceof particiapi.AuthenticationRequiredError)) {
                throw error;
            }
        }

        this.baseElement.addEventListener("click", this);
        this.baseElement.addEventListener("input", this);
        this.baseElement.addEventListener("submit", this);

        this.update();
    }

    showError(message, details = "") {
        const clone = this.errorMessageTemplate.content.cloneNode(true);

        for (let el of clone.querySelectorAll("[data-id]")) {
            el.id = el.dataset.id;
        }
        clone.querySelector("#error-message-text").textContent = message;
        clone.querySelector("#error-details-text").textContent = details;
        this.baseElement.querySelector("#error-message").replaceChildren(clone);
    }

    startPoll() {
        if (this.pollTimer !== null) {
            return;
        }
        const interval = getRandomInt(POLL_INTERVAL_MIN, POLL_INTERVAL_MAX);
        this.pollTimer = setTimeout(this.onPollTimer.bind(this), interval);
    }

    stopPoll() {
        if (this.pollTimer === null) {
            return;
        }
        clearTimeout(this.pollTimer);
        this.pollTimer = null;
    }

    setActiveTab(tab) {
        const tabs = tab.closest(".tabs");
        tabs.querySelector(".tab-active").classList.remove("tab-active");
        tabs.querySelector(".tabpanel-active").classList.remove("tabpanel-active");
        tab.classList.add("tab-active");
        tabs.querySelector(`#${tab.value}`).classList.add("tabpanel-active");
    }

    updateTitle() {
        document.title = this.client.conversation.topic;
    }

    updateIntro() {
        this.baseElement.querySelector("#topic").textContent = this.client.conversation.topic;
        this.baseElement.querySelector("#description").innerHTML = marked.parseInline(this.client.conversation.description);
    }

    updateLoginButton() {
        this.loginButton.disabled = !this.client.authenticationRequired;
    }

    getSeedStatementText() {
        for (const statement of this.client.conversation.seedStatements.values()) {
            if (!statement.isMeta) {
                return statement.text;
            }
        }
        return this.client.conversation.seedStatements.values().next().value?.text ?? "";
    }

    truncateStatementText(text) {
        const maxLength = this.statementTextArea.maxLength > 0 ? this.statementTextArea.maxLength : 1000;
        return text.length > maxLength ? text.slice(0, maxLength) + "\u2026" : text;
    }

    updateInactiveOverlay() {
        const closedOverlay = this.baseElement.querySelector("#inactive-overlay");
        if (this.client.conversation.isActive) {
            closedOverlay.classList.remove("overlay-visible");
        } else {
            closedOverlay.classList.add("overlay-visible");
        }
    }

    updateLoginOverlay() {
        const loginOverlay = this.baseElement.querySelector("#login-overlay");
        this.baseElement.querySelector("#seed-statement").textContent = this.truncateStatementText(this.getSeedStatementText());
        this.updateLoginButton();
        if (this.client.authenticationRequired) {
            loginOverlay.classList.add("overlay-visible");
        } else {
            loginOverlay.classList.remove("overlay-visible");
        }
    }

    updateStatement() {
        const noStatementsOverlay = this.baseElement.querySelector("#no-statements-overlay");
        const statement = this.client.getNextStatement();
        if (typeof statement === "undefined") {
            noStatementsOverlay.classList.add("overlay-visible");
        } else {
            const votingTemplate = statement.isMeta ?
                this.baseElement.querySelector("#meta-voting-template") :
                this.baseElement.querySelector("#statement-voting-template");
            const clone = votingTemplate.content.cloneNode(true);
            for (let el of clone.querySelectorAll("[data-id]")) {
                el.id = el.dataset.id;
            }
            const votingContainer = this.baseElement.querySelector("#voting");
            clone.querySelector("#voting-statement").textContent = this.truncateStatementText(statement.text);
            clone.querySelector("#voting-buttons").disabled =
                !this.client.conversation.isActive || this.client.authenticationRequired;
            votingContainer.replaceChildren(clone);
            document.forms["voting-form"].elements["statement-id"].value = statement.id;
            noStatementsOverlay.classList.remove("overlay-visible");
        }
    }

    updateNotifications() {
        const notificationsCheckbox = this.baseElement.querySelector("#notifications")
        notificationsCheckbox.disabled =
            !this.client.participant.notifications.email ||
            !this.client.conversation.notificationsAvailable ||
            !this.client.conversation.isActive ||
            this.client.authenticationRequired;
        notificationsCheckbox.checked = this.client.participant.notifications.enabled;
    }

    updateStatementGlyphCount() {
        document.querySelector("#statement-glyph-count").textContent =
            `${this.statementTextArea.value.length}/${this.statementTextArea.maxLength}`;
    }

    updateStatementForm() {
        this.baseElement.querySelector("#statement-widgets").disabled =
            !this.client.conversation.statementsAllowed ||
            !this.client.conversation.isActive ||
            this.client.authenticationRequired;
    }

    createGroupResultNodes(results) {
        let resultNodes = [];
        for (const type of ["agree", "disagree"]) {
            for (const result of results[type]) {
                const valuePercent = Math.round(result.value * 100);
                const resultItemTemplate = this.baseElement.querySelector(`#result-item-${type}-template`);
                const clone = resultItemTemplate.content.cloneNode(true);
                clone.querySelector(".result-statement").textContent = this.truncateStatementText(result.statementText);
                clone.querySelector(".result-value-percent").textContent = `${valuePercent}%`;
                clone.querySelector(".result-bar").value = valuePercent;
                resultNodes.push(clone);
            }
        }
        resultNodes.sort((a, b) => {
            const aValue = a.querySelector(".result-bar").value;
            const bValue = b.querySelector(".result-bar").value;
            if (aValue > bValue) {
                return -1;
            } else if (aValue < bValue) {
                return 1;
            }
            return 0;
        });
        return resultNodes;
    }

    updateResults() {
        const results = this.baseElement.querySelector("#results");
        results.hidden = !this.client.conversation.resultsAvailable;

        for (const [i, button] of results.querySelectorAll(".tab:not(#tab-majority)").entries()) {
            button.hidden = i >= this.client.results.groups.length;
        }

        const majorityResultNodes = this.createGroupResultNodes(this.client.results.majority);
        results.querySelector("#tabpanel-majority .results-list").replaceChildren(...majorityResultNodes);

        for (const [i, tabContent] of results.querySelectorAll(".tabpanel:not(#tabpanel-majority)").entries()) {
            if (i < this.client.results.groups.length) {
                const resultNodes = this.createGroupResultNodes(this.client.results.groups[i]);
                tabContent.querySelector(".results-list").replaceChildren(...resultNodes);
                tabContent.hidden = false;
            } else {
                tabContent.querySelector(".results-list").replaceChildren();
                tabContent.hidden = true;
            }
        }

        if (results.querySelector(".tab-active").hidden) {
            this.setActiveTab(results.querySelector("#tab-majority"));
        }
    }

    update() {
        if (this.client.conversation.isActive && !this.client.authenticationRequired) {
            this.startPoll();
        } else {
            this.stopPoll();
        }
        this.updateTitle();
        this.updateIntro();
        this.updateInactiveOverlay();
        this.updateLoginOverlay();
        this.updateStatement();
        this.updateStatementGlyphCount();
        this.updateNotifications();
        this.updateStatementForm();
        this.updateResults();
    }

    onLoginMessage(ev) {
        if (ev.origin !== this.client.baseURL.origin || ev.source !== this.loginWindow) {
            return;
        }

        clearInterval(this.loginWindowTimer);
        this.loginWindowTimer = null;
        this.loginWindow.close();
        this.loginWindow = null;

        if (typeof ev.data === "string" && ev.data !== "") {
            this.showError(this.translations.authenticationFailed, ev.data);
            this.updateLoginButton();
            return;
        }

        this.client.init().then(() => {
            this.update();
        });
    }

    // check if login window was closed
    onLoginWindowTimer() {
        if (this.loginWindow === null || this.loginWindow.closed) {
            clearInterval(this.loginWindowTimer);
            this.loginWindowTimer = null;
            this.loginWindow = null;
            this.updateLoginButton();
        }
    }

    async onPollTimer() {
        this.pollTimer = null;
        let resultsChanged;
        let statementsChanged;
        try {
            statementsChanged = await this.client.pollStatements();
            resultsChanged = await this.client.pollResults();
        } catch (error) {
            if (error instanceof particiapi.AuthenticationRequiredError) {
                this.update();
            } else if (error instanceof particiapi.ResultsNotAvailableError) {
                resultsChanged = true;
            } else if (error instanceof particiapi.ParticiapiError) {
                this.showError(this.translations.pollingFailed, error);
            } else {
                throw error;
            }
        } finally {
            if (this.client.conversation.isActive && !this.client.authenticationRequired) {
                this.startPoll();
            }
        }

        if (resultsChanged) {
            this.updateResults();
        }
        if (statementsChanged) {
            this.updateStatement();
        }
    }

    // open login popup
    onLoginClick(ev) {
        ev.preventDefault();

        if (this.loginWindow !== null) {
            return;
        }

        const width = 600;
        const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        this.loginWindow = window.open(
            this.client.loginURL,
            "particiapi-login",
            `popup width=${width} height=${height} top=${top} left=${left}`
        );
        if (this.loginWindow === null) {
            return;
        }

        this.loginButton.disabled = true;

        // check if window is closed without successful authentication
        this.loginWindowTimer = setInterval(this.onLoginWindowTimer.bind(this), 1000);

        window.addEventListener("message", this, {once: true});
    }

    async onVotingButtonClick(ev) {
        ev.preventDefault();

        const vote = parseInt(ev.target.value, 10);
        const statementID = parseInt(ev.target.form.elements["statement-id"].value);
        this.baseElement.querySelector("#voting-buttons").disabled = true;
        try {
            await this.client.addVote(statementID, vote);
        } catch(error) {
            if ((error instanceof particiapi.AuthenticationRequiredError) ||
                (error instanceof particiapi.ConversationInactiveError)) {
                this.update();
            }
            if (error instanceof particiapi.ParticiapiError) {
                if (!(error instanceof particiapi.AuthenticationRequiredError)) {
                    this.showError(this.translations.votingFailed, error);
                }
            } else {
                throw error;
            }
        } finally {
            this.baseElement.querySelector("#voting-buttons").disabled = false;
        }

        this.updateStatement();
    }

    async onNotificationsClick(ev) {
        ev.target.disabled = true;
        try {
            await this.client.setNotifications(ev.target.checked);
        } catch(error) {
            if ((error instanceof particiapi.AuthenticationRequiredError) ||
                (error instanceof particiapi.ConversationInactiveError) ||
                (error instanceof particiapi.NotificationsNotAvailableError) ||
                (error instanceof particiapi.EmailAddressMissingError)) {
                this.update();
            }
            if (error instanceof particiapi.ParticiapiError) {
                if (!(error instanceof particiapi.AuthenticationRequiredError)) {
                    this.showError(this.translations.changingNotificationsFailed, error);
                }
            } else {
                throw error;
            }
        } finally {
            this.updateNotifications();
        }
    }

    async onStatementSubmit(ev) {
        ev.preventDefault();

        const text = ev.target["statement-text"].value;
        ev.target["statement-widgets"].disabled = true;
        try {
            await this.client.addStatement(text);
        } catch(error) {
            if ((error instanceof particiapi.AuthenticationRequiredError) ||
                (error instanceof particiapi.ConversationInactiveError) ||
                (error instanceof particiapi.StatementsNotAllowedError)) {
                this.update();
            }
            if (error instanceof particiapi.ParticiapiError) {
                if (!(error instanceof particiapi.AuthenticationRequiredError)) {
                    this.showError(this.translations.statementFailed, error);
                }
            } else {
                throw error;
            }
        } finally {
            this.updateStatementForm();
        }
        this.baseElement.querySelector("#statement-message").hidden = false;
        ev.target["statement-text"].value = "";
        this.updateStatementGlyphCount();
    }

    handleEvent(ev) {
        switch (ev.type) {
        case "click":
            if (ev.target === this.loginButton) {
                this.onLoginClick(ev);
            } else if (ev.target.name === "vote") {
                this.onVotingButtonClick(ev);
            } else if (ev.target.name === "notifications") {
                this.onNotificationsClick(ev);
            } else if (ev.target.name === "tab") {
                this.setActiveTab(ev.target);
            }
            break;
        case "input":
            if (ev.target === this.statementTextArea) {
                this.baseElement.querySelector("#statement-message").hidden = true;
                this.updateStatementGlyphCount();
            }
            break;
        case "submit":
            this.onStatementSubmit(ev);
            break;
        case "message":
            this.onLoginMessage(ev);
            break;
        }
    }
}

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

export class ParticiapiError extends Error {
    constructor(message = "Unknown error") {
        super(message);
    }
}

export class NotFoundError extends ParticiapiError {
    constructor(message = "Conversation was not found") {
        super(message);
    }
}

export class StatementExistsError extends ParticiapiError {
    constructor(message = "Statement already exists") {
        super(message);
    }
}

export class ConversationInactiveError extends ParticiapiError {
    constructor(message = "Conversation is inactive") {
        super(message);
    }
}

export class StatementsNotAllowedError extends ParticiapiError {
    constructor(message = "Statements not allowed") {
        super(message);
    }
}

export class NotificationsNotAvailableError extends ParticiapiError {
    constructor(message = "Notifications not available") {
        super(message);
    }
}

export class EmailAddressMissingError extends ParticiapiError {
    constructor(message = "Email address missing") {
        super(message);
    }
}

export class ResultsNotAvailableError extends ParticiapiError {
    constructor(message = "Results not available") {
        super(message);
    }
}

export class SessionRequiredError extends ParticiapiError {
    constructor(message = "Session required") {
        super(message);
    }
}

export class HTTPError extends ParticiapiError {
    constructor(status, message = "Unknown HTTP error") {
        super(message);
        this.status = status;
    }
}

export class APIError extends HTTPError {
    constructor(status, {type = "about:blank", title: message = "Unknown API error", details = ""}) {
        super(status, message);
        this.type = type;
        this.details = details;
    }
}

export class AuthenticationRequiredError extends APIError {
    constructor(status, {type = "about:blank", title: message = "Authentication required", details = ""}) {
        super(403, type, message, type, details);
    }
}

class Statement {
    constructor({id, text, is_meta: isMeta, is_seed: isSeed}) {
        this.id = Number(id);
        this.text = text;
        this.isMeta = isMeta;
        this.isSeed = isSeed;
    }
}

class Result {
    constructor({statement_id: statementID, statement_text: statementText, value}) {
        this.statementID = Number(statementID);
        this.statementText = statementText;
        this.value = value;
    }
}

class GroupResults {
    constructor({agree: agree = [], disagree: disagree = []} = {}) {
        this.agree = [];
        this.disagree = [];
        for (const o of agree) {
            this.agree.push(new Result(o));
        }
        for (const o of disagree) {
            this.disagree.push(new Result(o));
        }
    }
}

class Results {
    constructor({majority: majority = {}, groups: groups = []} = {}) {
        this.majority = new GroupResults(majority);
        this.groups = [];
        for (const o of groups) {
            this.groups.push(new GroupResults(o));
        }
    }
}

class Notifications {
    constructor({enabled = false, email = null}) {
        this.enabled = enabled;
        this.email = email;
    }
}

class Participant {
    constructor({votes = [], statements = [], notifications = {}} = {}) {
        this.votes = new Set(votes);
        this.statements = new Set(statements);
        this.notifications = new Notifications(notifications);
    }
}

class Conversation {
    constructor(
        conversationID,
        {
            topic = "",
            description = "",
            linkURL = "",
            is_active: isActive = false,
            statements_allowed: statementsAllowed = false,
            notifications_available: notificationsAvailable = false,
            results_available: resultsAvailable = false,
            seed_statements: seedStatements = {},
        } = {}
    ) {
        this.id = conversationID;
        this.topic = topic;
        this.description = description;
        this.linkURL = linkURL;
        this.isActive = isActive;
        this.statementsAllowed = statementsAllowed;
        this.notificationsAvailable = notificationsAvailable;
        this.resultsAvailable = resultsAvailable;
        this.seedStatements = new Map();
        for (const [id, entry] of Object.entries(seedStatements)) {
            this.seedStatements.set(Number(id), new Statement(entry));
        }
    }
}

export class ConversationClient {
    #sessionURL;
    #conversationURL;
    #participantURL;
    #votesBaseURL;
    #statementsURL;
    #resultsURL;
    #notificationsURL;
    #csrfToken;

    constructor(baseURL, conversationID) {
        const urlWithPath = (path) => {
            const url = new URL(baseURL);
            url.pathname = path;
            return url;
        }

        this.baseURL = new URL(baseURL);
        this.conversationID = conversationID;

        this.loginURL = urlWithPath(`/auth/login`);

        this.#sessionURL = urlWithPath(`/api/session`);
        this.#conversationURL = urlWithPath(`/api/conversations/${this.conversationID}`);
        this.#participantURL = urlWithPath(`/api/conversations/${this.conversationID}/participant`);
        this.#votesBaseURL = urlWithPath(`/api/conversations/${this.conversationID}/votes`);
        this.#statementsURL = urlWithPath(`/api/conversations/${this.conversationID}/statements/`);
        this.#resultsURL = urlWithPath(`/api/conversations/${this.conversationID}/results/`);
        this.#notificationsURL = urlWithPath(`/api/conversations/${this.conversationID}/participant/notifications`);

        this.#csrfToken = "";

        this.authenticated = false;
        this.authenticationRequired = true;

        this.conversation = new Conversation(conversationID);
        this.statements = new Map();
        this.participant = new Participant();
        this.results = new Results();
    }

    async #handleErrorResponse(response) {
        const contentType = response.headers.get("Content-Type");
        let problemDetails = {};
        if (contentType !== null && contentType.includes("application/problem+json")) {
            problemDetails = await response.json();
        }

        switch (problemDetails.type) {
        case "tag:partici.app,2024:api:errors:authentication_required":
            this.#csrfToken = "";
            this.authenticated = false;
            this.authenticationRequired = true;
            this.participant = new Participant();
            this.statements = new Map();
            throw new AuthenticationRequiredError(response.status, problemDetails);
        case "tag:partici.app,2024:api:errors:email_address_missing":
            this.conversation.notificationsAvailable = false;
            throw new EmailAddressMissingError(problemDetails.message);
        case "tag:partici.app,2024:api:errors:not_found":
            throw new NotFoundError(problemDetails.message);
        case "tag:partici.app,2024:api:errors:statement_exists":
            throw new StatementExistsError(problemDetails.message);
        case "tag:partici.app,2024:api:errors:conversation_inactive":
            this.conversation.isActive = false;
            throw new ConversationInactiveError(problemDetails.message);
        case "tag:partici.app,2024:api:errors:statements_not_allowed":
            this.conversation.statementsAllowed = false;
            throw new StatementsNotAllowedError(problemDetails.message);
        case "tag:partici.app,2024:api:errors:notifications_not_available":
            this.conversation.notificationsAvailable = false;
            throw new NotificationsNotAvailableError(problemDetails.message);
        case "tag:partici.app,2024:api:errors:results_not_available":
            this.conversation.resultsAvailable = false;
            throw new ResultsNotAvailableError(problemDetails.message);
        case "tag:partici.app,2024:api:errors:session_required":
            throw new SessionRequiredError(problemDetails.message);
        default:
            if (response.status > 399) {
                throw new APIError(response.status, problemDetails);
            } else {
                throw new HTTPError(response.status, "unexpected HTTP status");
            }
        }
    }

    async #fetchConversation(options = {}) {
        const response = await fetch(this.#conversationURL, options);
        if (!response.ok) {
            await this.#handleErrorResponse(response);
        }
        const data = await response.json();
        return new Conversation(this.conversationID, data);
    }

    async #fetchJSON(url, options = {}) {
        const response = await fetch(url,
            Object.assign({
                mode: "cors",
                credentials: "include",
            }, options)
        );
        if (!response.ok) {
            await this.#handleErrorResponse(response);
        }
        return response.json();
    }

    async #updateSession(create = false, options = {}) {
        const url = create ? this.#sessionURL + "?create=true" : this.#sessionURL;
        const response = await fetch(url,
            Object.assign({
                method: "POST",
                mode: "cors",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({})
            }, options)
        );
        if (!response.ok) {
            await this.#handleErrorResponse(response);
        }
        ({
            csrf_token: this.#csrfToken,
            authenticated: this.authenticated,
        } = await response.json());
    }

    async #submitJSON(method, url, body, options = {}) {
        if (!this.conversation.isActive) {
            throw new ConversationInactiveError();
        }

        if (this.#csrfToken === "") {
            await this.#updateSession(true);
        }

        const response = await fetch(url,
            Object.assign({
                method: method,
                mode: "cors",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": this.#csrfToken
                },
                body: JSON.stringify(body)
            }, options)
        );
        if (!response.ok) {
            await this.#handleErrorResponse(response);
        }
        return response;
    }

    async #fetchStatements(options = {}) {
        const data = await this.#fetchJSON(this.#statementsURL, options);
        const orderedEntries = Object.values(data);
        // shuffle using the modern Fisher-Yates algorithm
        for (let i = orderedEntries.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [orderedEntries[i], orderedEntries[j]] = [orderedEntries[j], orderedEntries[i]];
        }
        // sort meta statements before seed statements before all other statements
        orderedEntries.sort((a, b) => {
            if (a.is_meta && !b.is_meta) {
                return -1;
            } else if (!a.is_meta && b.is_meta) {
                return 1;
            }
            if (a.is_seed && !b.is_seed) {
                return -1;
            } else if (!a.is_seed && b.is_seed) {
                return 1;
            }
            return 0;
        });

        const statements = new Map();
        for (const entry of orderedEntries) {
            statements.set(entry.id, new Statement(entry));
        }
        return statements;
    }

    async #fetchResults(options = {}) {
        const data = await this.#fetchJSON(this.#resultsURL, options);
        return new Results(data);
    }

    async #fetchParticipant(options = {}) {
        const data = await this.#fetchJSON(this.#participantURL, options);
        return new Participant(data);
    }

    async pollStatements(options = {}) {
        const statements = await this.#fetchStatements(
            {signal: options.signal}
        );
        if (statements.size !== this.statements.size) {
            this.statements = statements;
            return true;
        }
        for (const id of statements.keys()) {
            if (!this.statements.has(id)) {
                return true;
            }
        }
        return false;
    }

    async pollResults(options = {}) {
        if (!this.conversation.resultsAvailable) {
            throw new ResultsNotAvailableError();
        }

        const results = await this.#fetchResults(
            {signal: options.signal}
        );

        function groupResultChanged(oldGroup, newGroup) {
            if (newGroup.agree.length !== oldGroup.agree.length ||
                newGroup.disagree.length !== oldGroup.disagree.length) {
                return true;
            }
            for (let type of ["agree", "disagree"]) {
                for (let i = 0; i < newGroup[type].length; i++) {
                    if (newGroup[type][i].statementID !== oldGroup[type][i].statementID ||
                        newGroup[type][i].value !== oldGroup[type][i].value) {
                        return true;
                    }
                }
            }
            return false;
        }
        if (groupResultChanged(results.majority, this.results.majority)) {
            this.results = results;
            return true;
        }
        if (results.groups.length !== this.results.groups.length) {
            this.results = results;
            return true;
        }
        for (let i = 0; i < results.groups.length; i++) {
            if (groupResultChanged(results.groups[i], this.results.groups[i])) {
                this.results = results;
                return true;
            }
        }
        return false;
    }

    async addVote(statementID, value, options = {}) {
        await this.#submitJSON(
            "PUT",
            `${this.#votesBaseURL}/${statementID}`,
            {value},
            {signal: options.signal}
        );
        this.participant.votes.add(statementID);
    }

    async addStatement(text, options = {}) {
        if (!this.conversation.statementsAllowed) {
            throw new StatementsNotAllowedError();
        }

        const response = await this.#submitJSON(
            "POST",
            this.#statementsURL,
            {text},
            {signal: options.signal}
        );
        const data = await response.json();
        const statement = new Statement(data);
        this.statements.set(statement.id, statement);
        this.participant.statements.add(statement.id);
    }

    async setNotifications(enabled, options = {}) {
        if (!this.conversation.notificationsAvailable) {
            throw new NotificationsNotAvailableError();
        }

        await this.#submitJSON(
            "PUT",
            this.#notificationsURL,
            {enabled},
            {signal: options.signal}
        );
        this.participant.notifications.enabled = enabled;
    }

    async init(options = {}) {
        this.conversation = await this.#fetchConversation(
            {signal: options.signal}
        );
        try {
            this.results = await this.#fetchResults(
                {signal: options.signal}
            );
        } catch(error) {
            if (!(error instanceof ResultsNotAvailableError)) {
                throw error;
            }
        }

        let statements;
        let participant;
        try {
            await this.#updateSession(false, {signal: options.signal});
            statements = await this.#fetchStatements({signal: options.signal});
        } catch (error) {
            if (error instanceof AuthenticationRequiredError) {
                return;
            }
            throw error;
        }
        this.statements = statements;
        this.authenticationRequired = false;

        try {
            participant = await this.#fetchParticipant(
                {signal: options.signal}
            );
        } catch (error) {
            if (error instanceof SessionRequiredError) {
                return;
            }
            throw error;
        }
        this.participant = participant;
    }

    getNextStatement() {
        if (this.authenticationRequired) {
            for (const statement of this.conversation.seedStatements.values()) {
                if (!statement.isMeta) {
                    return statement;
                }
            }
            return this.conversation.seedStatements.values().next().value;
        }

        for (const id of this.statements.keys()) {
            if (!this.participant.votes.has(id) &&
                !this.participant.statements.has(id)) {
                return this.statements.get(id);
            }
        }
    }
}

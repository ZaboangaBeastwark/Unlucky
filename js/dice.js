// js/dice.js

/**
 * Executes a Daggerheart 2d12 roll and logs it to the server.
 * @param {number} sessionId 
 * @param {string} actorName 
 * @param {string} actionName 
 * @param {number} modifier 
 * @returns {Promise<object>}
 */
async function rollDaggerheart(sessionId, actorName, actionName, modifier = 0) {
    try {
        const result = await apiCall('rolls.php', 'POST', {
            session_id: sessionId,
            actor_name: actorName,
            action_name: actionName,
            modifier: modifier
        });

        // Optional: Trigger global dice animations here before returning
        return result;
    } catch (e) {
        console.error('Roll failed', e);
        throw e;
    }
}

/**
 * Utility to fetch new logs since a certain log ID
 */
async function fetchLogs(sessionId, lastId = 0) {
    return await apiCall(`logs.php?session_id=${sessionId}&last_id=${lastId}`);
}

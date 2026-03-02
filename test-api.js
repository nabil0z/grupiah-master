const fetch = require('node-fetch');

async function testTasks() {
    try {
        const res = await fetch('http://localhost:53000/tasks', {
            headers: {
                'Authorization': `tma mock_token`
            }
        });
        const data = await res.json();
        console.log("Status /tasks:", res.status);
        console.log("Tasks length:", data.length);

        const res2 = await fetch('http://localhost:53000/users/leaderboard', {
            headers: {
                'Authorization': `tma mock_token`
            }
        });
        const data2 = await res2.json();
        console.log("Status /leaderboard:", res2.status);
    } catch (e) {
        console.error(e);
    }
}
testTasks();

import { ActivityType } from "discord.js";
import { event, Events } from "../utils/index.js";

export default event(Events.ClientReady, ({log}, client) => {

    client.user.setActivity("Ping me!", {
        type: ActivityType.Playing
    })

    return log(`Logged in as ${client.user.username}`);

})
import { Client, TextChannel, EmbedBuilder } from "discord.js";
import noblox from "noblox.js";
import { LogError } from "../../util/functions";

import { AppDataSource } from "../../typeorm";
import { JoinWhitelist } from '../../typeorm/entities/JoinList';

const JoinWhitelistRepository = AppDataSource.getRepository(JoinWhitelist);

const JoinPrerequisites = {
    age: 30,
    friendCount: 5,
    followerCount: 10,
};

export async function handleGroupJoinRequest(
    client: Client<true>,
): Promise<void> {
    try {
        const logChannel = client.channels.cache.get("1139486037429735445") as TextChannel;
        const joinEvent = noblox.onJoinRequestHandle(32906850);

        joinEvent.on("data", async function (request) {
            const userId = request.requester.userId;
            const userInfo = await noblox.getPlayerInfo(userId);

            const playerThumbnail = await noblox.getPlayerThumbnail(userId, 420, "png", true, "headshot");

            let passesAge = false;
            let passesFriends = false;
            let passesFollowers = false;

            const embed = new EmbedBuilder()
                .setAuthor({ name: `View Profile`, url: `https://www.roblox.com/users/${userId}/profile`, iconURL: `https://cdn.discordapp.com/attachments/1094123407144145089/1139492024295358585/Main_SCP.png` })
                .setTimestamp()
                .setThumbnail(playerThumbnail[0]!["imageUrl"]!)
                .setDescription(`
Account Created: <t:${Math.round(userInfo.joinDate.getTime() / 1000)}:d>
Friend Count: ${userInfo.friendCount}
Follower Count: ${userInfo.followerCount}
                `);

            const JoinException = await JoinWhitelistRepository.findOneBy({ robloxId: userId.toString() });

            if (JoinException) {
                const isWhitelisted = JoinException.whitelisted as boolean;

                joinEvent.emit("handle", request, isWhitelisted);
                return;
            };

            if (userInfo) {
                passesAge = (userInfo.age! >= JoinPrerequisites.age);
                passesFriends = (userInfo.friendCount! >= JoinPrerequisites.friendCount);
                passesFollowers = (userInfo.followerCount! >= JoinPrerequisites.followerCount);

                if (passesAge && passesFriends && passesFollowers) {
                    joinEvent.emit("handle", request, true);

                    await logChannel.send({
                        embeds: [
                            embed.setColor("Green").setTitle(`${userInfo.username} Accepted`)
                        ]
                    });

                    return;
                } else {
                    await logChannel.send({
                        embeds: [
                            embed.setColor("Red").setTitle(`${userInfo.username} Denied`)
                        ]
                    });

                    joinEvent.emit("handle", request, false);
                    return;
                }
            }

            joinEvent.emit("handle", request, false);
            return;
        });

        return;
    } catch (error: any) {
        await LogError(error);
        return;
    }
}

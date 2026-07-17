const { EmbedBuilder } = require('discord.js');
const youtubeChannelRepo = require('../repositories/youtubeChannelRepo');
const youtubeVideoRepo = require('../repositories/youtubeVideoRepo');
const LogService = require('./LogService');

/**
 * Parse YouTube RSS feed XML to extract video IDs and metadata.
 * YouTube RSS format: https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxxxx
 */
function parseYouTubeRSS(xmlString) {
  const videos = [];
  
  // Simple regex-based parsing (no XML library dependency)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlString)) !== null) {
    const entry = match[1];

    // Extract video ID from yt:videoId tag
    const videoIdMatch = /<yt:videoId>(.*?)<\/yt:videoId>/.exec(entry);
    if (!videoIdMatch) continue;
    const videoId = videoIdMatch[1];

    // Extract title
    const titleMatch = /<title>(.*?)<\/title>/.exec(entry);
    const title = titleMatch ? titleMatch[1] : 'Untitled';

    // Extract published date
    const publishedMatch = /<published>(.*?)<\/published>/.exec(entry);
    const published = publishedMatch ? new Date(publishedMatch[1]) : new Date();

    // Extract channel name
    const channelMatch = /<name>(.*?)<\/name>/.exec(entry);
    const channelName = channelMatch ? channelMatch[1] : 'Unknown';

    videos.push({
      videoId,
      title,
      published,
      channelName,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  return videos;
}

module.exports = {
  /**
   * Check a YouTube channel for new videos and notify Discord if found.
   * Uses RSS feed (no API key needed).
   */
  async checkAndNotify(guild, monitoredChannel) {
    try {
      const youtubeChannelId = monitoredChannel.youtube_channel_id;
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeChannelId}`;

      // Fetch RSS feed. YouTube sometimes silently blocks (403) requests from
      // cloud/datacenter IPs (like Railway) that don't send a normal browser User-Agent.
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) {
        console.error(`YouTube RSS fetch failed: ${response.status}`);
        await LogService.log(
          guild,
          'youtube-error',
          `⚠️ Gagal cek update channel **${monitoredChannel.youtube_channel_name}** (HTTP ${response.status}). Channel ID mungkin salah atau YouTube menolak request.`
        );
        return { success: false, error: `HTTP ${response.status}` };
      }

      const xml = await response.text();
      const videos = parseYouTubeRSS(xml);

      if (!videos.length) {
        return { success: true, newVideos: 0 };
      }

      // Filter: only notify about videos published after last check
      const lastCheck = monitoredChannel.last_check ? new Date(monitoredChannel.last_check) : new Date(Date.now() - 24 * 60 * 60 * 1000); // default 24h ago
      const newVideos = videos.filter((v) => v.published > lastCheck && !youtubeVideoRepo.exists(guild.id, v.videoId));

      if (!newVideos.length) {
        youtubeChannelRepo.updateLastCheck(monitoredChannel.id);
        return { success: true, newVideos: 0 };
      }

      // Send notifications to Discord
      const discordChannel = guild.channels.cache.get(monitoredChannel.channel_id);
      if (!discordChannel) {
        return { success: false, error: 'Discord channel not found' };
      }

      for (const video of newVideos) {
        const embed = new EmbedBuilder()
          .setTitle(`🎥 ${video.title}`)
          .setURL(video.url)
          .setColor(0xff0000) // YouTube red
          .setAuthor({ name: video.channelName, url: `https://www.youtube.com/channel/${youtubeChannelId}` })
          .setDescription(`Klik link untuk nonton video`)
          .setImage(`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`)
          .setTimestamp(video.published);

        await discordChannel.send({ embeds: [embed] }).catch(console.error);

        // Record in database
        youtubeVideoRepo.add(guild.id, video.videoId, video.title, video.url, video.published);

        await LogService.log(guild, 'youtube', `New video: "${video.title}" from ${video.channelName}`);
      }

      youtubeChannelRepo.updateLastCheck(monitoredChannel.id);

      return { success: true, newVideos: newVideos.length };
    } catch (err) {
      console.error('YouTubeService.checkAndNotify error:', err);
      await LogService.log(
        guild,
        'youtube-error',
        `⚠️ Error saat cek channel **${monitoredChannel.youtube_channel_name}**: ${err.message}`
      ).catch(() => {});
      return { success: false, error: err.message };
    }
  },

  /**
   * Start polling YouTube channels (call this at bot startup).
   * Polls every X minutes.
   */
  startPolling(client, pollIntervalMinutes = 10) {
    const runCheck = async () => {
      for (const guild of client.guilds.cache.values()) {
        const channels = youtubeChannelRepo.listByGuild(guild.id);
        for (const ch of channels) {
          await this.checkAndNotify(guild, ch);
        }
      }
    };

    // Run once immediately on startup (don't wait for the first interval to elapse),
    // delayed slightly so the client has time to finish caching guilds/channels.
    setTimeout(runCheck, 10 * 1000);

    setInterval(runCheck, pollIntervalMinutes * 60 * 1000);

    console.log(`✅ YouTube Monitor polling started (interval: ${pollIntervalMinutes} min)`);
  },
};

import { Rule } from 'sanity'

export default {
  name: 'radioConfig',
  title: 'Konfigurasi Radio & Live',
  type: 'document',
  icon: () => '📻',
  fieldsets: [
    {
      name: 'stationMetadata',
      title: 'Metadata Stasiun Utama',
      options: { collapsible: true, collapsed: false }
    },
    {
      name: 'broadcastingManagement',
      title: 'Sistem Otomatisasi Jadwal & Acara',
      options: { collapsible: false }
    }
  ],
  fields: [
    // =========================================================================
    // FIELDSET 1: METADATA UTAMA STASIUN
    // =========================================================================
    {
      name: 'radioName',
      title: 'Nama Stasiun Radio',
      type: 'string',
      fieldset: 'stationMetadata',
      initialValue: 'Radio Suara Al Muttaqin',
      validation: (rule: Rule) => rule.required().min(3).max(50),
    },
    {
      name: 'stationTagline',
      title: 'Slogan / Tagline Radio',
      type: 'string',
      fieldset: 'stationMetadata',
      initialValue: 'Al Muttaqin Islamic Broadcast',
      validation: (rule: Rule) => rule.required(),
    },
    {
      name: 'fallbackThumbnail',
      title: 'Cover Art Default (Fallback)',
      description: 'Gambar banner yang muncul di player jika acara tidak memiliki thumbnail khusus.',
      type: 'image',
      fieldset: 'stationMetadata',
      options: { hotspot: true },
    },

    // =========================================================================
    // FIELDSET 2: SISTEM JADWAL TUNGGAL 24 JAM & MINGGUAN (HYBRID)
    // =========================================================================
    {
      name: 'schedules',
      title: 'Rangkaian Jadwal Siaran 24 Jam',
      description: 'Susun daftar rangkaian acara harian berdasarkan alokasi waktu jam aktif di bawah ini.',
      fieldset: 'broadcastingManagement',
      type: 'array',
      validation: (rule: Rule) => rule.required().min(1).error('Minimal harus ada 1 jadwal siaran aktif.'),
      of: [
        {
          type: 'object',
          name: 'radioSchedule',
          title: 'Blok Jadwal Siaran',
          icon: () => '🕒',
          fields: [
            {
              name: 'day',
              title: 'Hari Siaran',
              type: 'string',
              description: 'Pilih hari spesifik untuk jadwal ini. Pilih "Setiap Hari" jika rutin tayang tiap hari.',
              options: {
                list: [
                  { title: '🔄 Setiap Hari', value: 'everyday' },
                  { title: 'Senin', value: 'Monday' },
                  { title: 'Selasa', value: 'Tuesday' },
                  { title: 'Rabu', value: 'Wednesday' },
                  { title: 'Kamis', value: 'Thursday' },
                  { title: 'Jumat', value: 'Friday' },
                  { title: 'Sabtu', value: 'Saturday' },
                  { title: 'Minggu', value: 'Sunday' },
                ],
              },
              initialValue: 'everyday',
              validation: (rule: Rule) => rule.required().error('Hari siaran wajib ditentukan.'),
            },
            {
              name: 'eventName',
              title: 'Nama Acara / Kajian',
              type: 'string',
              validation: (rule: Rule) => rule.required().error('Nama acara wajib diisi.'),
            },
            {
              name: 'speaker',
              title: 'Narasumber / Murattal Oleh',
              type: 'string',
              description: 'Contoh: Ustadz Dr. KH. Ahmad, S.Ag atau Nama Qori',
              initialValue: 'Al Mutaqin Jepara',
            },
            {
              name: 'startTime',
              title: 'Jam Mulai (Format HH:MM)',
              type: 'string',
              description: 'Gunakan format 24 jam dengan batas penulisan yang ketat. Contoh: 04:30, 09:00, 18:15',
              placeholder: '04:30',
              validation: (rule: Rule) => rule.required().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'HH:MM format' }),
            },
            {
              name: 'endTime',
              title: 'Jam Selesai (Format HH:MM)',
              type: 'string',
              description: 'Contoh: 06:00, 11:30, 19:30',
              validation: (rule: Rule) => rule.required().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { name: 'HH:MM format' }),
            },
            {
              name: 'broadcastMode',
              title: 'Mode Siaran Jam Ini',
              type: 'string',
              options: {
                list: [
                  { title: '🎥 Live YouTube', value: 'youtube_live' },
                  { title: '🎵 Playlist MP3 Internal', value: 'playlist_mp3' },
                  { title: '📻 Relay Radio FM / Live Stream Lain', value: 'relay_stream' },
                ],
                layout: 'radio',
              },
              initialValue: 'playlist_mp3',
              validation: (rule: Rule) => rule.required(),
            },
            
            // -----------------------------------------------------------------
            // FIELD KONDISIONAL: MUNCUL JIKA MEMILIH MODE RELAY RADIO FM
            // -----------------------------------------------------------------
            {
              name: 'relayAudioUrl',
              title: 'URL Stream Radio FM Target (Relay)',
              type: 'url',
              description: 'Masukkan URL Icecast/Shoutcast resmi radio target. Contoh RadioMu: http://streaming.radiomu.id:8000/stream atau RRI: http://stream.rri.co.id:8000/pro3',
              placeholder: 'http://streaming.radiomu.id:8000/stream',
              hidden: ({ parent }: any) => parent?.broadcastMode !== 'relay_stream',
              validation: (rule: Rule) =>
                rule.custom((value, context: any) => {
                  if (context.parent?.broadcastMode === 'relay_stream' && !value) {
                    return 'URL Stream Relay wajib diisi jika memilih mode Relay Radio.';
                  }
                  return true;
                }),
            },

            // -----------------------------------------------------------------
            // FIELD KONDISIONAL: MUNCUL JIKA MEMILIH MODE YOUTUBE LIVE
            // -----------------------------------------------------------------
            {
              name: 'youtubeVideoId',
              title: 'YouTube Video ID',
              type: 'string',
              description: 'Masukkan ID video saja dari tautan live streaming YouTube. (Contoh: dQw4w9WgXcQ)',
              placeholder: 'dQw4w9WgXcQ',
              hidden: ({ parent }: any) => parent?.broadcastMode !== 'youtube_live',
              validation: (rule: Rule) =>
                rule.custom((value, context: any) => {
                  if (context.parent?.broadcastMode === 'youtube_live' && !value) {
                    return 'Video ID wajib diisi jika Anda memilih mode Live YouTube.';
                  }
                  return true;
                }),
            },

            // -----------------------------------------------------------------
            // FIELD KONDISIONAL: MUNCUL JIKA MEMILIH MODE PLAYLIST MP3
            // -----------------------------------------------------------------
            {
              name: 'playlist',
              title: 'Daftar File MP3 (Playlist)',
              type: 'array',
              hidden: ({ parent }: any) => parent?.broadcastMode !== 'playlist_mp3',
              validation: (rule: Rule) =>
                rule.custom((value, context: any) => {
                  const tracks = value as any[];
                  if (context.parent?.broadcastMode === 'playlist_mp3' && (!tracks || tracks.length === 0)) {
                    return 'Minimal isi 1 track link audio ke dalam playlist antrean.';
                  }
                  return true;
                }),
              of: [
                {
                  type: 'object',
                  name: 'track',
                  title: 'Track Audio',
                  icon: () => '🎵',
                  fields: [
                    { name: 'trackTitle', title: 'Judul Audio', type: 'string', validation: (rule: Rule) => rule.required().error('Judul track audio tidak boleh kosong.') },
                    { name: 'speaker', title: 'Narasumber / Pengisi', type: 'string' },
                    { 
                      name: 'audioUrl', 
                      title: 'Link Tautan Langsung Audio (Direct Link .mp3)', 
                      type: 'url',
                      description: 'Masukkan URL mp3 langsung dari archive.org, cloud storage, atau server luar. Pastikan tautan berakhiran .mp3',
                      placeholder: 'https://archive.org/download/folder-audio/file.mp3',
                      validation: (rule: Rule) => rule.required().error('Wajib memasukkan tautan langsung file audio.')
                    },
                  ],
                  preview: {
                    select: {
                      title: 'trackTitle',
                      artist: 'speaker',
                    },
                    prepare(selection: any) {
                      const { title, artist } = selection
                      return {
                        title: title || 'Track Tanpa Judul',
                        subtitle: artist ? `👤 ${artist}` : '👤 Radio Al Muttaqin',
                      }
                    },
                  },
                },
              ],
            },
          ],
          
          // Layout preview list item di dashboard admin agar dinamis & informatif
          preview: {
            select: {
              title: 'eventName',
              start: 'startTime',
              end: 'endTime',
              mode: 'broadcastMode',
              speakerName: 'speaker',
              daySelected: 'day'
            },
            prepare(selection: any) {
              const { title, start, end, mode, speakerName, daySelected } = selection
              
              let modeLabel = '🎵 MP3 Playlist'
              if (mode === 'youtube_live') modeLabel = '🎥 YT Live'
              if (mode === 'relay_stream') modeLabel = '📻 FM Relay'
              
              const dayLabels: Record<string, string> = {
                everyday: 'Setiap Hari',
                Monday: 'Senin',
                Tuesday: 'Selasa',
                Wednesday: 'Rabu',
                Thursday: 'Kamis',
                Friday: 'Jumat',
                Saturday: 'Sabtu',
                Sunday: 'Minggu'
              }
              const activeDay = dayLabels[daySelected || 'everyday'] || 'Setiap Hari'

              return {
                title: title || 'Acara Tanpa Nama',
                subtitle: `📅 [${activeDay}] 🕒 ${start || '00:00'} - ${end || '00:00'} | ${modeLabel} — Oleh: ${speakerName || 'Radio Al Muttaqin'}`,
              }
            },
          },
        },
      ],
    },
  ],
}
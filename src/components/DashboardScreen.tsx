import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';

interface Scene {
  scene: string;
  visuals: string;
  audio: string;
  text: string;
}

interface IdeaPayload {
  id: string;
  user_id: string;
  topic: string;
  title: string | null;
  hook: string | null;
  visual_style: string | null;
  script: string | null;
  audio_vibe: string | null;
  created_at?: string | null;
  user_point?: number | null;
  primary_niche: string | null;
}

const INITIAL_IDEA: IdeaPayload = {
  id: 'd9b23b3a-592f-4c55-a0bb-2646c243bc1a',
  user_id: 'auth-uuid',
  topic: 'Coding Mistakes',
  title: 'Stop Doing X',
  hook: 'Why you are doing X wrong...',
  visual_style: 'Dramatic close-up, high contrast lighting',
  audio_vibe: 'Fast-paced synthwave beat',
  script: JSON.stringify([
    {
      scene: 'SCENE 1',
      visuals: 'Pointing finger at the camera in a dark studio, blue ring light glowing',
      audio: 'Stop scrolling! Here is the one thing you are doing wrong.',
      text: 'STOP DOING THIS',
    },
    {
      scene: 'SCENE 2',
      visuals: 'Over-the-shoulder coding setup, typing molecular state logic',
      audio: 'You write code without planning out the state flow first.',
      text: 'THE BIGGEST MISTAKE',
    },
    {
      scene: 'SCENE 3',
      visuals: 'Zoom in on a clean dashboard mockup',
      audio: 'Create modular files and map them to your database early.',
      text: 'DO IT BETTER',
    },
  ]),
  primary_niche: 'Tech',
  created_at: new Date().toISOString(),
  user_point: 0,
};

interface DashboardScreenProps {
  userEmail?: string;
  userId?: string;
}

export function DashboardScreen({ userEmail, userId }: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'home' | 'create' | 'archive' | 'profile' | 'settings'>('home');
  const [selectedIdeaDetailId, setSelectedIdeaDetailId] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<IdeaPayload[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [idea, setIdea] = useState<IdeaPayload>(INITIAL_IDEA);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [isRatingSubmitted, setIsRatingSubmitted] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'model'; parts: string }>>([
    { role: 'model', parts: 'Hi! I am your Scrollab partner. Tell me how to refine this script.' },
  ]);

  // Create New Idea Tab inputs
  const [newTopic, setNewTopic] = useState('');
  const [newNiche, setNewNiche] = useState('All');
  const [referenceVideo, setReferenceVideo] = useState('');
  const [showReferenceUrl, setShowReferenceUrl] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Studio Control Center / Settings States
  const [enhancerEnabled, setEnhancerEnabled] = useState(true);
  const [copilotSync, setCopilotSync] = useState(true);
  const [pushNotification, setPushNotification] = useState(false);
  const [cachePersistence, setCachePersistence] = useState(true);

  useEffect(() => {
    async function fetchIdeas() {
      try {
        setLoadingIdeas(true);
        let activeUserId = userId;
        if (!activeUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          activeUserId = user?.id;
        }

        if (!activeUserId) {
          setLoadingIdeas(false);
          return;
        }

        const { data, error } = await supabase
          .from('generated_ideas')
          .select('*')
          .eq('user_id', activeUserId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setIdeas(data);
          setIdea(data[0]);
          if (data[0].user_point) {
            setRating(Number(data[0].user_point));
          } else {
            setRating(0);
          }
        } else {
          const fallback = { ...INITIAL_IDEA, user_id: activeUserId };
          setIdeas([fallback]);
          setIdea(fallback);
          setRating(0);
        }
      } catch (err) {
        console.error('Error fetching generated ideas:', err);
      } finally {
        setLoadingIdeas(false);
      }
    }

    fetchIdeas();
  }, [userId]);

  const handleIncomingUrl = (url: string) => {
    if (!url) return;
    try {
      const urlObj = url.split('?');
      if (urlObj.length > 1) {
        const queryParams = urlObj[1].split('&');
        const urlParam = queryParams.find(param => param.startsWith('url='));
        const typeParam = queryParams.find(param => param.startsWith('type='));

        if (urlParam) {
          const sharedLink = decodeURIComponent(urlParam.substring(4));
          if (sharedLink) {
            if (sharedLink.startsWith('file://')) {
              setReferenceVideo(sharedLink);
              setShowReferenceUrl(true);
              setNewTopic('Shared Media');
              setActiveTab('create');
              Alert.alert(
                'Media Shared!',
                'We have pre-filled your shared media file as a reference for your new script.',
                [{ text: "Great! Let's go" }]
              );
            } else {
              setReferenceVideo(sharedLink);
              setShowReferenceUrl(true);
              setNewTopic(`Instagram Shared Post: ${sharedLink}`);
              setActiveTab('create');
              Alert.alert(
                'Instagram Post Shared!',
                'We have pre-filled the shared Instagram post as a reference for your new viral script.',
                [{ text: "Great! Let's go" }]
              );
            }
          }
        } else if (typeParam) {
          const mediaType = typeParam.substring(5);
          setActiveTab('create');
          Alert.alert(
            'Media Shared!',
            `We have opened Scrollab from your shared ${mediaType} to help you write a viral script.`,
            [{ text: "Awesome!" }]
          );
        }
      }
    } catch (err) {
      console.log('Error parsing deep link:', err);
    }
  };

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleIncomingUrl(url);
      }
    }).catch(err => console.log('Error getting initial URL:', err));

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url) {
        handleIncomingUrl(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleSelectIdea = (selectedIdea: IdeaPayload) => {
    setIdea(selectedIdea);
    setSelectedSceneIndex(0);
    if (selectedIdea.user_point) {
      setRating(Number(selectedIdea.user_point));
    } else {
      setRating(0);
    }
    setSelectedIdeaDetailId(selectedIdea.id);
  };

  const handleShare = async () => {
    try {
      let shareContent = `🎬 *${idea.title || 'Untitled Script'}*\n`;
      shareContent += `Niche: ${idea.primary_niche || 'General'}\n`;
      if (idea.hook) {
        shareContent += `🪝 Hook: ${idea.hook}\n\n`;
      }

      let scenes: Scene[] = [];
      if (idea.script) {
        try {
          const outerParsed = JSON.parse(idea.script);
          scenes = typeof outerParsed === 'string' ? JSON.parse(outerParsed) : outerParsed;
        } catch (e) {
          // ignore
        }
      }

      if (scenes && scenes.length > 0) {
        scenes.forEach((s, idx) => {
          shareContent += `🎥 *Scene ${idx + 1}* (${s.scene || ''})\n`;
          shareContent += `Visuals: ${s.visuals || ''}\n`;
          shareContent += `Audio: ${s.audio || ''}\n`;
          if (s.text) {
            shareContent += `Text Overlay: "${s.text}"\n`;
          }
          shareContent += `\n`;
        });
      }

      shareContent += `Created with Scrollab ✨`;

      await Share.share({
        message: shareContent,
        title: idea.title || 'Scrollab Script',
      });
    } catch (error: any) {
      Alert.alert('Sharing Error', error.message);
    }
  };

  let parsedScenes: Scene[] = [];
  try {
    const scriptStr = idea.script || '[]';
    const outerParsed = typeof scriptStr === 'string' ? JSON.parse(scriptStr) : scriptStr;
    parsedScenes = typeof outerParsed === 'string' ? JSON.parse(outerParsed) : outerParsed;
  } catch (err) {
    console.error('Failed to parse scenes:', err);
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err: any) {
      Alert.alert('Sign Out Failed', err?.message || 'Error occurred during sign-out.');
    }
  };

  const handleRateIdea = async (stars: number) => {
    setRating(stars);
    setIsRatingSubmitted(true);

    // Update active idea locally
    setIdea((prev) => ({
      ...prev,
      user_point: stars,
    }));

    // Update switcher list locally
    setIdeas((prevIdeas) =>
      prevIdeas.map((item) =>
        item.id === idea.id ? { ...item, user_point: stars } : item
      )
    );

    try {
      // 1. Write back directly to Supabase table
      const { error } = await supabase
        .from('generated_ideas')
        .update({ user_point: stars })
        .eq('id', idea.id);

      if (error) {
        console.error('Error writing user_point to Supabase:', error);
      }

      // 2. Call external POST rating logic in background (no-op on failure)
      await fetch('https://ufpyjlhflfkvmkzgaafc.supabase.co/api/ideas/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: idea.id, rating: stars }),
      }).catch(() => null);
    } catch (err) {
      console.error('Error saving rating:', err);
    }

    setTimeout(() => {
      setIsRatingSubmitted(false);
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userText = chatMessage.trim();
    setChatMessage('');
    const newHistory = [...chatHistory, { role: 'user' as const, parts: userText }];
    setChatHistory(newHistory);
    setIsChatLoading(true);

    // Dynamic AI response generation simulation
    setTimeout(async () => {
      let refinedScript = idea.script;
      let assistantReply = "I have refined your script with those changes!";

      if (userText.toLowerCase().includes('short') || userText.toLowerCase().includes('cut')) {
        assistantReply = "Got it! I shortened the scenes and focused the core hooks. Check it out!";
        refinedScript = JSON.stringify([
          {
            scene: 'SCENE 1 (REFINED)',
            visuals: 'Close up pointing at camera with rapid dynamic scale.',
            audio: 'Stop! You are doing code wrong. Here is the secret.',
            text: 'STOP DOING THIS',
          },
          {
            scene: 'SCENE 2 (REFINED)',
            visuals: 'Dashboard visual showing clean state flows.',
            audio: 'Structure your data persistency before you write UI.',
            text: 'FIX YOUR STATE',
          },
        ]);
      } else if (userText.toLowerCase().includes('dramatic') || userText.toLowerCase().includes('slow')) {
        assistantReply = "Added cinematic visual styling and slow cinematic audio cues!";
        refinedScript = JSON.stringify([
          {
            scene: 'SCENE 1',
            visuals: 'Super high contrast silhouette, neon shadows flickering.',
            audio: '[Whispers] They do not want you to know the actual structure.',
            text: 'THE TRUTH',
          },
          {
            scene: 'SCENE 2',
            visuals: 'Dramatic macro pan on code terminal with pulsing red accents.',
            audio: 'One simple bug ruins your entire persistent JWT state.',
            text: 'THE BREACH',
          },
          {
            scene: 'SCENE 3',
            visuals: 'Bright soft purple ambient transition glowing warmly.',
            audio: 'Let Supabase store it with encrypted JWTs. Done.',
            text: 'SCROLLAB AI',
          },
        ]);
      } else {
        assistantReply = `Understood! Adjusting details for "${userText}". I've updated the script content.`;
        refinedScript = JSON.stringify(
          parsedScenes.map((s, idx) => ({
            ...s,
            scene: `SCENE ${idx + 1} (UPDATED)`,
            visuals: `${s.visuals} [Tweak: ${userText}]`,
          }))
        );
      }

      const rawTitle = idea.title || 'Untitled Idea';
      const refinedTitle = rawTitle.endsWith('(Refined)') ? rawTitle : `${rawTitle} (Refined)`;

      // Update both active idea and ideas list in state
      setIdea((prev) => ({
        ...prev,
        title: refinedTitle,
        script: refinedScript,
      }));

      setIdeas((prevIdeas) =>
        prevIdeas.map((item) =>
          item.id === idea.id
            ? { ...item, title: refinedTitle, script: refinedScript }
            : item
        )
      );

      // Write back to Supabase generated_ideas table
      try {
        const { error } = await supabase
          .from('generated_ideas')
          .update({
            title: refinedTitle,
            script: refinedScript,
          })
          .eq('id', idea.id);

        if (error) {
          console.error('Error saving refined script to Supabase:', error);
        }
      } catch (err) {
        console.error('Error during Supabase update:', err);
      }

      setChatHistory((prev) => [...prev, { role: 'model' as const, parts: assistantReply }]);
      setSelectedSceneIndex(0);
      setIsChatLoading(false);
    }, 1500);
  };

  const handleInspireMe = () => {
    const inspirations: Record<string, string[]> = {
      All: [
        "Why the 10,000-hour rule is a complete lie in 2026",
        "The absolute best way to learn any skill in 30 days",
        "How a simple cup of coffee teaches you about software engineering",
        "The hidden psychology of why we can't stop checking our phones",
        "What happens to your brain when you sleep for only 5 hours"
      ],
      Comedy: [
        "Why developers are actually comedians in disguise",
        "The funny lie every software engineer tells their project manager",
        "When you fix a bug in production but break 5 other features",
        "Me explaining my state flow to my non-tech friends",
        "How standard HTML forms make creators lose their minds"
      ],
      Beauty: [
        "The absolute truth about expensive skincare branding secrets",
        "Why the cosmetic industry wants you to believe this one myth",
        "How to get a perfect glowing skin using only 3 natural elements",
        "The dark side of viral beauty hacks you see on social media",
        "My 3-step minimalist hair routine that saves $200 a month"
      ],
      Fitness: [
        "Why stretching for 2 minutes is better than a 1-hour run",
        "How building muscle actually accelerates your creative brain",
        "The perfect 5-minute morning routine to boost your active energy",
        "Why calorie counting is holding you back from real physical power",
        "The simple posture fix that changes how you stand in 3 days"
      ],
      Education: [
        "The dark history of the modern school grading system",
        "How to read a 300-page book in 3 hours and remember everything",
        "The secret method Nobel prize winners use to solve complex tasks",
        "Why standard education teaches you how to memorize, not how to build",
        "Three ancient philosophy lessons that will fix your life decisions"
      ],
      Productivity: [
        "How I did 40 hours of work in 4 hours using this simple terminal hack",
        "Why a to-do list is actually killing your creative momentum",
        "The time-blocking rule used by the top 1% of creative minds",
        "How to enter deep focus mode in under 60 seconds",
        "Why waking up at 5:00 AM might actually be ruining your day"
      ],
      Lifestyle: [
        "How a week of silence changed the way I interact with humans",
        "The minimalist apartment tour: why less physical items brings peace",
        "My digital detox experiment: going off-grid for 72 hours",
        "How to build a healthy morning routine that you actually enjoy",
        "Why buying more things will never satisfy your creative soul"
      ],
      Tech: [
        "This new AI model can write entire apps in under 3 seconds",
        "Why standard REST APIs are being replaced by real-time streams",
        "How to build a database schema in 5 minutes with Supabase",
        "The biggest state management mistake React developers make",
        "Why bun is replacing npm as the ultimate package manager"
      ],
      Finance: [
        "Why holding cash in 2026 is a silent tax on your future",
        "The three investments every 20-year-old should make today",
        "How compound interest can turn $10 a day into half a million",
        "The difference between assets and liabilities explained simply",
        "Why your home might not actually be the best financial asset"
      ],
      Parenting: [
        "The funny lie every parent tells their kids about screen time",
        "How to keep your child creative without buying expensive toys",
        "The simple way to teach kids about financial responsibility early",
        "Why allowing children to fail is the greatest parenting gift",
        "How to manage work-from-home life with multiple toddlers"
      ],
      Food: [
        "The secret ingredient in restaurant pasta that makes it taste 10x better",
        "How to make a perfect barista-style espresso at home without a machine",
        "Why eating this one simple food every morning boosts focus by 50%",
        "The ultimate 10-minute high-protein creative lunch recipe",
        "What food additives to avoid if you want to keep your body healthy"
      ],
      Other: [
        "The hidden science of why physical books feel better than screens",
        "Why standard desk layouts are bad for your creative posture",
        "The strange connection between walking in nature and solving bugs",
        "How to design a premium color palette from real-world objects",
        "Why doing absolutely nothing for 10 minutes is a creative cheat code"
      ]
    };

    const list = inspirations[newNiche] || inspirations['All'];
    const randomIndex = Math.floor(Math.random() * list.length);
    setNewTopic(list[randomIndex]);
  };

  const handleCreateIdea = async () => {
    if (!newTopic.trim()) {
      Alert.alert('Missing Field', 'Please enter an engaging topic.');
      return;
    }
    setIsGenerating(true);

    try {
      const mockScript = [
        {
          scene: 'SCENE 1',
          visuals: `Dynamic close-up focusing on ${newTopic.trim()} elements, warm neon ring lights glowing.`,
          audio: `Stop wasting time! Here is the absolute truth about ${newTopic.trim()} that you need to know.`,
          text: 'THE REALITY CHECK',
        },
        {
          scene: 'SCENE 2',
          visuals: 'Fast montage edits, split screen showing comparative designs or layout flows.',
          audio: 'Most people spend hours on generic tools instead of planning out custom database schemas early.',
          text: 'PLAN BETTER',
        },
        {
          scene: 'SCENE 3',
          visuals: 'Clean minimalist screen transition, zoom on premium branding logo.',
          audio: 'Structure it early. Follow for more premium creator insights!',
          text: 'SCROLLAB AI',
        },
      ];

      const dbNiche = newNiche === 'All' ? 'Creative' : newNiche;
      const titleVal = `Mastering ${newTopic.trim()}`;
      const hookVal = `Why you are failing at ${newTopic.trim()}...`;
      let visualVal = 'Modern aesthetic, playful flat graphics';
      if (referenceVideo.trim()) {
        visualVal = `${visualVal} (Reference video: ${referenceVideo.trim()})`;
      }
      const audioVal = 'Upbeat energetic synthwave beat';

      const newIdeaObj = {
        user_id: userId || 'temp-id',
        topic: newTopic.trim(),
        title: titleVal,
        hook: hookVal,
        visual_style: visualVal,
        audio_vibe: audioVal,
        script: JSON.stringify(mockScript),
        primary_niche: dbNiche,
        user_point: 0,
      };

      const { data, error } = await supabase
        .from('generated_ideas')
        .insert([newIdeaObj])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const created = data[0];
        setIdeas((prev) => [created, ...prev]);
        setIdea(created);
        setRating(0);
        setSelectedSceneIndex(0);

        // Reset fields
        setNewTopic('');
        setNewNiche('All');
        setReferenceVideo('');
        setShowReferenceUrl(false);

        setSelectedIdeaDetailId(created.id);
        Alert.alert('Script Generated!', 'Your new script is loaded into the Workspace.');
        setActiveTab('home');
      }
    } catch (err: any) {
      console.error('Error generating idea:', err);
      Alert.alert('Generation Error', err?.message || 'Failed to save script.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleArchiveDelete = async (idToDelete: string) => {
    Alert.alert(
      'Delete Generated Script',
      'Are you sure you want to permanently delete this script from your Scrollab Studio workspace?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('generated_ideas')
                .delete()
                .eq('id', idToDelete);

              if (error) throw error;

              // Filter out local ideas list
              const remaining = ideas.filter((item) => item.id !== idToDelete);
              setIdeas(remaining);

              // If deleted idea was the active one, shift active idea
              if (idea.id === idToDelete) {
                if (remaining.length > 0) {
                  setIdea(remaining[0]);
                  setRating(Number(remaining[0].user_point) || 0);
                  setSelectedSceneIndex(0);
                } else {
                  setIdea(INITIAL_IDEA);
                  setRating(0);
                  setSelectedSceneIndex(0);
                }
              }
            } catch (err) {
              console.error('Error deleting idea:', err);
              Alert.alert('Delete Failed', 'Failed to remove script from Database.');
            }
          },
        },
      ]
    );
  };

  const formatCardDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    } catch (e) {
      return 'Recent';
    }
  };

  const renderWorkspaceTab = () => {
    if (!selectedIdeaDetailId) {
      return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardFeedScroll}>
          {ideas.length === 0 ? (
            <View style={styles.emptyCardFeedContainer}>
              <Text style={styles.emptyCardFeedText}>No generated ideas yet in your studio.</Text>
              <TouchableOpacity
                style={styles.emptyCardFeedButton}
                onPress={() => setActiveTab('create')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyCardFeedButtonText}>✨ Generate Your First Idea</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardFeedContainer}>
              {ideas.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.ideaCardPremium, theme.shadows.raised]}
                  onPress={() => handleSelectIdea(item)}
                  activeOpacity={0.95}
                >
                  {/* Top Row: Niche Badge & Rating Badge */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardNicheBadge}>
                      <Text style={styles.cardNicheText}>
                        {(item.primary_niche || 'GENERAL').toUpperCase()}
                      </Text>
                    </View>
                    
                    <View style={styles.cardRatingBadge}>
                      <Text style={styles.cardRatingText}>
                        {item.user_point !== undefined && item.user_point !== null ? item.user_point : 0} ★
                      </Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={styles.cardTitleText}>
                    {item.title || 'Untitled Idea'}
                  </Text>

                  {/* Hook Line with Bold "Kanca:" */}
                  {item.hook ? (
                    <Text style={styles.cardHookLine} numberOfLines={3}>
                      <Text style={styles.cardHookLabel}>Kanca: </Text>
                      <Text style={styles.cardHookText}>{item.hook}</Text>
                    </Text>
                  ) : null}

                  {/* Divider Line */}
                  <View style={styles.cardDivider} />

                  {/* Bottom Row: Date & Action */}
                  <View style={styles.cardBottomRow}>
                    <Text style={styles.cardDateText}>
                      {formatCardDate(item.created_at)}
                    </Text>
                    
                    <View style={styles.cardActionBtn}>
                      <Text style={styles.cardActionText}>Senaryoyu Gör →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      );
    }

    // Detail script view (active screen deep dive)
    return (
      <>
        {/* Back Header navigation */}
        <View style={styles.detailBackHeader}>
          <TouchableOpacity
            style={styles.detailBackBtn}
            onPress={() => setSelectedIdeaDetailId(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.detailBackBtnText}>← Geri Dön</Text>
          </TouchableOpacity>
          <Text style={styles.detailBackTitle} numberOfLines={1}>
            {idea.title || 'Untitled Script'}
          </Text>
          <TouchableOpacity
            style={styles.detailShareBtn}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Text style={styles.detailShareBtnText}>🔗 Paylaş</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Monospace API Badge */}
          <View style={styles.nicheBadgeContainer}>
            <Text style={styles.nicheLabel}>{(idea.primary_niche || 'General').toUpperCase()} • ACT I</Text>
            <Text style={styles.editorialIndicator}>EDITORIAL VERSION</Text>
          </View>

          {/* Narrative Card - Movie Script Panel */}
          <View style={[styles.ideaCard, theme.shadows.raised]}>
            <Text style={styles.ideaTitle}>{idea.title}</Text>

            {/* Hook Showcase Box */}
            <View style={styles.hookBox}>
              <Text style={styles.hookLabel}>PRIMARY HOOK LINE</Text>
              <Text style={styles.hookText}>"{idea.hook}"</Text>
            </View>

            {/* Layout Vibes */}
            <View style={styles.vibeRow}>
              <View style={styles.vibeItem}>
                <Text style={styles.vibeHeading}>VISUAL TREATMENT</Text>
                <Text style={styles.vibeText}>{idea.visual_style}</Text>
              </View>
              <View style={styles.vibeItem}>
                <Text style={styles.vibeHeading}>SONIC ATMOSPHERE</Text>
                <Text style={styles.vibeText}>{idea.audio_vibe}</Text>
              </View>
            </View>

            {/* Storyboard Scene Selector */}
            <Text style={styles.sectionHeader}>Script Chapters</Text>
            <View style={styles.sceneTabs}>
              {parsedScenes.map((s, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.sceneTabButton,
                    selectedSceneIndex === idx && styles.sceneTabButtonActive,
                  ]}
                  onPress={() => setSelectedSceneIndex(idx)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.sceneTabButtonText,
                      selectedSceneIndex === idx && styles.sceneTabButtonTextActive,
                    ]}
                  >
                    {s.scene ? s.scene.replace('SCENE ', 'Scene ') : `Scene ${idx + 1}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Selected Scene Content Block */}
            {parsedScenes[selectedSceneIndex] && (
              <View style={styles.sceneContainer}>
                <View style={styles.sceneHeaderRow}>
                  <Text style={styles.sceneIndexLabel}>
                    {parsedScenes[selectedSceneIndex].scene}
                  </Text>
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>DIRECTOR CUE</Text>
                  </View>
                </View>

                <View style={styles.sceneDetailBlock}>
                  <Text style={styles.detailTitle}>🎥 SCENE STAGE DIRECTIONS</Text>
                  <Text style={styles.detailBody}>{parsedScenes[selectedSceneIndex].visuals}</Text>
                </View>

                <View style={styles.sceneDetailBlock}>
                  <Text style={styles.detailTitle}>🎙️ SPOKEN VOICE & SOUNDS</Text>
                  <Text style={styles.detailBody}>{parsedScenes[selectedSceneIndex].audio}</Text>
                </View>

                <View style={styles.sceneDetailBlock}>
                  <Text style={styles.detailTitle}>🏷️ ON-SCREEN OVERLAY TEXT</Text>
                  <View style={styles.overlayTextContainer}>
                    <Text style={styles.overlayTextContent}>
                      {parsedScenes[selectedSceneIndex].text}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Viral Stars Rating Component */}
          <View style={[styles.rateCard, theme.shadows.ring]}>
            <Text style={styles.rateCardTitle}>Viral Potential Forecast</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => handleRateIdea(star)} activeOpacity={0.7}>
                  <Text style={[styles.starSymbol, rating >= star && styles.starSymbolActive]}>
                    {rating >= star ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {isRatingSubmitted && (
              <Text style={styles.ratingFeedback}>Pacing rating recorded in core logbook! 📓</Text>
            )}
          </View>

          {/* Co-Pilot Interactive Notebook */}
          <View style={styles.chatSection}>
            <Text style={styles.chatTitle}>✍🏼 Writer’s Refinement Logbook</Text>
            <Text style={styles.chatDesc}>
              Type refinement directions (e.g. "make it dramatic" or "shorten script")
            </Text>

            {/* Notebook Bubbles */}
            <View style={styles.chatBubbleContainer}>
              {chatHistory.map((ch, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.chatBubble,
                    ch.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleModel,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatText,
                      ch.role === 'user' ? styles.chatTextUser : styles.chatTextModel,
                    ]}
                  >
                    {ch.parts}
                  </Text>
                </View>
              ))}
              {isChatLoading && (
                <View style={styles.chatBubbleLoader}>
                  <ActivityIndicator size="small" color={theme.colors.accentSecondary} />
                  <Text style={styles.chatLoadingText}>Drafting revision...</Text>
                </View>
              )}
            </View>

            {/* Notebook Inputs */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="Suggest a dramatic tweak..."
                placeholderTextColor={theme.colors.muted}
                value={chatMessage}
                onChangeText={setChatMessage}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
                editable={!isChatLoading}
              />
              <TouchableOpacity
                style={[styles.sendButton, isChatLoading && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={isChatLoading}
              >
                <Text style={styles.sendButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </>
    );
  };

  const renderCreateTab = () => {
    const niches = [
      'All',
      'Comedy',
      'Beauty',
      'Fitness',
      'Education',
      'Productivity',
      'Lifestyle',
      'Tech',
      'Finance',
      'Parenting',
      'Food',
      'Other',
    ];

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Heading */}
        <Text style={styles.webMainHeader}>What's your next viral idea?</Text>

        {/* Niche Selector Grid */}
        <View style={styles.webNichePillsContainer}>
          {niches.map((n) => {
            const isSelected = newNiche === n;
            return (
              <TouchableOpacity
                key={n}
                style={[
                  styles.webNichePill,
                  isSelected ? styles.webNichePillActive : styles.webNichePillInactive,
                ]}
                onPress={() => setNewNiche(n)}
                disabled={isGenerating}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.webNichePillText,
                    isSelected ? styles.webNichePillTextActive : styles.webNichePillTextInactive,
                  ]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Glowing Chat Input Container */}
        <View style={styles.webChatInputWrapper}>
          <TextInput
            style={styles.webChatTextInput}
            placeholder="Describe your topic..."
            placeholderTextColor="#94A3B8"
            value={newTopic}
            onChangeText={setNewTopic}
            editable={!isGenerating}
            multiline={false}
          />

          <TouchableOpacity
            style={styles.webInspireMeBtn}
            onPress={handleInspireMe}
            disabled={isGenerating}
            activeOpacity={0.7}
          >
            <Text style={styles.webInspireMeText}>✨ Inspire Me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.webSendBtn,
              newTopic.trim().length > 0 && styles.webSendBtnActive,
            ]}
            onPress={handleCreateIdea}
            disabled={isGenerating || newTopic.trim().length === 0}
            activeOpacity={0.8}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.webSendBtnText}>↑</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Reference Video Link */}
        <TouchableOpacity
          style={styles.webReferenceVideoLink}
          onPress={() => setShowReferenceUrl(!showReferenceUrl)}
          disabled={isGenerating}
          activeOpacity={0.7}
        >
          <Text style={styles.webReferenceVideoText}>
            {showReferenceUrl ? '✕ Cancel Reference Video' : '＋ Add Reference Video'}
          </Text>
        </TouchableOpacity>

        {/* Secondary Slim Input for Reference Video URL */}
        {showReferenceUrl && (
          <View style={styles.webReferenceInputWrapper}>
            <TextInput
              style={styles.webReferenceInput}
              placeholder="Paste YouTube or TikTok reference link here..."
              placeholderTextColor="#94A3B8"
              value={referenceVideo}
              onChangeText={setReferenceVideo}
              editable={!isGenerating}
            />
          </View>
        )}
      </ScrollView>
    );
  };

  const renderArchiveTab = () => {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.tabHeaderContainer}>
          <Text style={styles.tabTitleHeader}>📦 Historical Scripts Archive</Text>
          <Text style={styles.tabDescHeader}>Review, re-load, or permanently clean up your workspace video scripts logs.</Text>
        </View>

        {ideas.length === 0 ? (
          <View style={styles.emptyArchiveContainer}>
            <Text style={styles.emptyArchiveText}>No historical drafts found in your studio.</Text>
            <TouchableOpacity style={styles.emptyArchiveButton} onPress={() => setActiveTab('create')}>
              <Text style={styles.emptyArchiveButtonText}>✨ Orchestrate Your First Script</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.archiveListContainer}>
            {ideas.map((item) => {
              const isActive = item.id === idea.id;
              const dateString = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent';

              return (
                <View key={item.id} style={[styles.archiveCard, isActive && styles.archiveCardActive, theme.shadows.ring]}>
                  <View style={styles.archiveCardHeader}>
                    <View style={styles.rowAlign}>
                      <View style={styles.archiveNicheBadge}>
                        <Text style={styles.archiveNicheText}>{(item.primary_niche || 'GENERAL').toUpperCase()}</Text>
                      </View>
                      {item.user_point !== undefined && item.user_point !== null && Number(item.user_point) > 0 ? (
                        <Text style={styles.archiveStars}>
                          {'★'.repeat(Number(item.user_point))}
                        </Text>
                      ) : (
                        <Text style={styles.archiveStarsEmpty}>Unrated</Text>
                      )}
                    </View>
                    <Text style={styles.archiveDate}>{dateString}</Text>
                  </View>

                  <Text style={styles.archiveTitle}>{item.title || 'Untitled Script'}</Text>
                  <Text style={styles.archiveTopic} numberOfLines={2}>Topic: {item.topic}</Text>

                  <View style={styles.archiveCardActions}>
                    <TouchableOpacity
                      style={[styles.archiveActionBtn, isActive && styles.archiveActionBtnActive]}
                      onPress={() => {
                        handleSelectIdea(item);
                        Alert.alert('Workspace Switch', `Selected "${item.title}" as active workspace script.`);
                        setActiveTab('home');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.archiveActionText, isActive && styles.archiveActionTextActive]}>
                        {isActive ? '🎬 Active Workspace' : '📂 Load Script'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.archiveDeleteBtn}
                      onPress={() => handleArchiveDelete(item.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.archiveDeleteText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderProfileTab = () => {
    const totalScripts = ideas.length;
    const ratedScripts = ideas.filter(i => i.user_point !== undefined && i.user_point !== null && Number(i.user_point) > 0);
    const avgRating = ratedScripts.length > 0
      ? (ratedScripts.reduce((acc, curr) => acc + (Number(curr.user_point) || 0), 0) / ratedScripts.length).toFixed(1)
      : '0.0';

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeaderContainer}>
          <View style={styles.profileAvatarContainer}>
            <Text style={styles.profileAvatarText}>
              {(userEmail || 'C').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileUserEmail}>{userEmail || 'creator@scrollab.ai'}</Text>
          <View style={styles.profileStatusBadge}>
            <Text style={styles.profileStatusText}>PRO CREATOR HUB</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.profileStatsContainer}>
          <View style={[styles.profileStatCard, theme.shadows.ring]}>
            <Text style={styles.profileStatValue}>{totalScripts}</Text>
            <Text style={styles.profileStatLabel}>ORCHESTRATED</Text>
          </View>
          <View style={[styles.profileStatCard, theme.shadows.ring]}>
            <Text style={styles.profileStatValue}>★ {avgRating}</Text>
            <Text style={styles.profileStatLabel}>AVG RATING</Text>
          </View>
        </View>

        {/* Studio Info Details */}
        <View style={[styles.ideaCard, theme.shadows.raised]}>
          <Text style={styles.profileSectionTitle}>Workspace Details</Text>

          <View style={styles.profileRowItem}>
            <Text style={styles.profileRowLabel}>Account Status</Text>
            <Text style={styles.profileRowValue}>Active Session</Text>
          </View>

          <View style={styles.profileRowItem}>
            <Text style={styles.profileRowLabel}>User ID</Text>
            <Text style={styles.profileRowMono}>{userId || 'N/A'}</Text>
          </View>

          <View style={styles.profileRowItem}>
            <Text style={styles.profileRowLabel}>Creative Design Engine</Text>
            <Text style={styles.profileRowValue}>Scrollab V3.5 (Playful)</Text>
          </View>

          <TouchableOpacity style={styles.profileSignOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Text style={styles.profileSignOutText}>🔒 Sign Out From Studio</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderSettingsTab = () => {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.tabHeaderContainer}>
          <Text style={styles.tabTitleHeader}>⚙️ Studio Control Center</Text>
          <Text style={styles.tabDescHeader}>Orchestrate your AI generation preferences, API nodes, and editor defaults.</Text>
        </View>

        {/* AI Model Preferences Card */}
        <View style={[styles.ideaCard, theme.shadows.raised]}>
          <Text style={styles.profileSectionTitle}>AI Design Preferences</Text>

          {/* Toggle Option 1 */}
          <TouchableOpacity
            style={styles.profileRowItem}
            activeOpacity={0.8}
            onPress={() => setEnhancerEnabled(!enhancerEnabled)}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.profileRowValue}>4K AI Video Enhancer</Text>
              <Text style={{ fontSize: 11, color: theme.colors.muted, marginTop: 2 }}>
                Inject dynamic cinematic camera directives automatically
              </Text>
            </View>
            <View style={[
              styles.mockSwitchTrack,
              enhancerEnabled ? styles.mockSwitchTrackActive : styles.mockSwitchTrackInactive
            ]}>
              <View style={[
                styles.mockSwitchThumb,
                enhancerEnabled ? styles.mockSwitchThumbActive : styles.mockSwitchThumbInactive
              ]} />
            </View>
          </TouchableOpacity>

          {/* Toggle Option 2 */}
          <TouchableOpacity
            style={styles.profileRowItem}
            activeOpacity={0.8}
            onPress={() => setCopilotSync(!copilotSync)}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.profileRowValue}>Real-time Co-Pilot Sync</Text>
              <Text style={{ fontSize: 11, color: theme.colors.muted, marginTop: 2 }}>
                Provide feedback and refine scripts instantly with active context
              </Text>
            </View>
            <View style={[
              styles.mockSwitchTrack,
              copilotSync ? styles.mockSwitchTrackActive : styles.mockSwitchTrackInactive
            ]}>
              <View style={[
                styles.mockSwitchThumb,
                copilotSync ? styles.mockSwitchThumbActive : styles.mockSwitchThumbInactive
              ]} />
            </View>
          </TouchableOpacity>

          {/* Toggle Option 3 */}
          <TouchableOpacity
            style={styles.profileRowItem}
            activeOpacity={0.8}
            onPress={() => setPushNotification(!pushNotification)}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.profileRowValue}>Push Script Notifications</Text>
              <Text style={{ fontSize: 11, color: theme.colors.muted, marginTop: 2 }}>
                Get notified when weekly viral templates are ready
              </Text>
            </View>
            <View style={[
              styles.mockSwitchTrack,
              pushNotification ? styles.mockSwitchTrackActive : styles.mockSwitchTrackInactive
            ]}>
              <View style={[
                styles.mockSwitchThumb,
                pushNotification ? styles.mockSwitchThumbActive : styles.mockSwitchThumbInactive
              ]} />
            </View>
          </TouchableOpacity>

          {/* Toggle Option 4 */}
          <TouchableOpacity
            style={styles.profileRowItem}
            activeOpacity={0.8}
            onPress={() => setCachePersistence(!cachePersistence)}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.profileRowValue}>Local Cache Persistence</Text>
              <Text style={{ fontSize: 11, color: theme.colors.muted, marginTop: 2 }}>
                Retain editor workspace history offline for zero-lag sessions
              </Text>
            </View>
            <View style={[
              styles.mockSwitchTrack,
              cachePersistence ? styles.mockSwitchTrackActive : styles.mockSwitchTrackInactive
            ]}>
              <View style={[
                styles.mockSwitchThumb,
                cachePersistence ? styles.mockSwitchThumbActive : styles.mockSwitchThumbInactive
              ]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Engine and Storage Log */}
        <View style={[styles.ideaCard, theme.shadows.raised]}>
          <Text style={styles.profileSectionTitle}>System Info</Text>

          <View style={styles.profileRowItem}>
            <Text style={styles.profileRowLabel}>App Version</Text>
            <Text style={styles.profileRowValue}>v1.4.0-premium</Text>
          </View>

          <View style={styles.profileRowItem}>
            <Text style={styles.profileRowLabel}>Database Latency</Text>
            <Text style={[styles.profileRowValue, { color: theme.colors.success }]}>14ms (Optimal)</Text>
          </View>

          <View style={styles.profileRowItem}>
            <Text style={styles.profileRowLabel}>Device Platform</Text>
            <Text style={styles.profileRowValue}>{Platform.OS === 'ios' ? 'Apple iOS' : 'Android OS'}</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      {/* Top Paper Header */}
      {activeTab === 'home' && !selectedIdeaDetailId && (
        <View style={styles.topBar}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerSubtitle}>SCROLLAB STUDIO</Text>
            <Text style={styles.headerEmail} numberOfLines={1}>
              👤 {userEmail || 'creator@scrollab.ai'}
            </Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Tab Routing Area */}
      <View style={[styles.tabContentArea, { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 92 : 92 }]}>
        {loadingIdeas ? (
          <View style={styles.loadingIdeasContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles.loadingIdeasText}>Synchronizing Scrollab Studio...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'home' && renderWorkspaceTab()}
            {activeTab === 'create' && renderCreateTab()}
            {activeTab === 'archive' && renderArchiveTab()}
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </>
        )}
      </View>

      {/* Bottom Sticky Tab Bar */}
      <View style={[styles.tabBarContainer, { bottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
        {/* Tab 1: Workspace */}
        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => {
            setSelectedIdeaDetailId(null);
            setActiveTab('home');
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBarIcon, activeTab === 'home' && styles.tabBarIconActive]}>🎬</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'home' && styles.tabBarLabelActive]}>Workspace</Text>
          {activeTab === 'home' && <View style={styles.tabActiveLine} />}
        </TouchableOpacity>

        {/* Tab 2: Archive */}
        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => setActiveTab('archive')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBarIcon, activeTab === 'archive' && styles.tabBarIconActive]}>📦</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'archive' && styles.tabBarLabelActive]}>Archive</Text>
          {activeTab === 'archive' && <View style={styles.tabActiveLine} />}
        </TouchableOpacity>

        {/* Tab 3: Create (Special Centered Floating Action Button) */}
        <View style={styles.tabBarCenterItem}>
          <TouchableOpacity
            style={[
              styles.tabBarCenterButton,
              activeTab === 'create' && styles.tabBarCenterButtonActive
            ]}
            onPress={() => setActiveTab('create')}
            activeOpacity={0.85}
          >
            <Text style={styles.tabBarCenterIcon}>✨</Text>
          </TouchableOpacity>
        </View>

        {/* Tab 4: Profile */}
        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBarIcon, activeTab === 'profile' && styles.tabBarIconActive]}>👤</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'profile' && styles.tabBarLabelActive]}>Profile</Text>
          {activeTab === 'profile' && <View style={styles.tabActiveLine} />}
        </TouchableOpacity>

        {/* Tab 5: Settings */}
        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBarIcon, activeTab === 'settings' && styles.tabBarIconActive]}>⚙️</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'settings' && styles.tabBarLabelActive]}>Settings</Text>
          {activeTab === 'settings' && <View style={styles.tabActiveLine} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  cardFeedScroll: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.huge,
  },
  cardFeedContainer: {
    gap: theme.spacing.lg,
  },
  emptyCardFeedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.huge,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.xxl,
    marginTop: theme.spacing.xxl,
  },
  emptyCardFeedText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.muted,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  emptyCardFeedButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
  emptyCardFeedButtonText: {
    fontFamily: theme.typography.fonts.display,
    color: theme.colors.accentOn,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.xs,
  },
  ideaCardPremium: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xxl,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardNicheBadge: {
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  cardNicheText: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentSecondary,
  },
  cardRatingBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cardRatingText: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg2,
  },
  cardTitleText: {
    fontFamily: theme.typography.fonts.display,
    fontSize: 20,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.fg,
    lineHeight: 26,
    marginBottom: theme.spacing.md,
  },
  cardHookLine: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.fg2,
    marginBottom: theme.spacing.md,
  },
  cardHookLabel: {
    fontFamily: theme.typography.fonts.body,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg,
  },
  cardHookText: {
    fontFamily: theme.typography.fonts.body,
    fontWeight: theme.typography.weights.regular,
    color: theme.colors.fg2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: theme.spacing.md,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDateText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: 13,
    color: theme.colors.muted,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionText: {
    fontFamily: theme.typography.fonts.display,
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentSecondary,
  },
  detailBackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
  },
  detailBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailBackBtnText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg2,
  },
  detailBackTitle: {
    flex: 1,
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg,
  },
  detailShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  detailShareBtnText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentSecondary,
  },
  switcherWrapper: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
  },
  switcherContainer: {
    paddingHorizontal: theme.spacing.xxl,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  switcherTab: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    width: 170, // Fixed width for comfortable card scanning
    borderWidth: 1.5,
  },
  switcherTabActive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
  },
  switcherTabInactive: {
    backgroundColor: theme.colors.surfaceWarm,
    borderColor: theme.colors.borderSoft,
  },
  switcherBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  switcherNiche: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
  },
  switcherNicheActive: {
    color: theme.colors.accent,
  },
  switcherNicheInactive: {
    color: theme.colors.muted,
  },
  switcherStarRating: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.warn,
  },
  switcherTitle: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  switcherTitleActive: {
    color: theme.colors.fg,
  },
  switcherTitleInactive: {
    color: theme.colors.fg2,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerSubtitle: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.fg,
    letterSpacing: 1,
  },
  headerEmail: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.accent,
    marginTop: 2,
    maxWidth: 200,
  },
  signOutButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  signOutText: {
    color: theme.colors.danger,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: theme.spacing.huge,
    paddingTop: theme.spacing.lg,
  },
  nicheBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  nicheLabel: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 1.2,
  },
  editorialIndicator: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.muted,
  },
  ideaCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xxl,
    marginBottom: theme.spacing.lg,
  },
  ideaTitle: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg,
    marginBottom: theme.spacing.md,
  },
  hookBox: {
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  hookLabel: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  hookText: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.fg,
    fontStyle: 'italic',
  },
  vibeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
  },
  vibeItem: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
  },
  vibeHeading: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 8,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.muted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  vibeText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: 11,
    color: theme.colors.fg2,
    fontWeight: theme.typography.weights.medium,
  },
  sectionHeader: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.muted,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  sceneTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  sceneTabButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  sceneTabButtonActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },
  sceneTabButtonText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.fg2,
    fontWeight: theme.typography.weights.bold,
  },
  sceneTabButtonTextActive: {
    color: theme.colors.accentOn,
  },
  sceneContainer: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
  },
  sceneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingBottom: theme.spacing.sm,
  },
  sceneIndexLabel: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
    marginRight: 6,
  },
  liveText: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 8,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg2,
    letterSpacing: 1,
  },
  sceneDetailBlock: {
    marginBottom: theme.spacing.md,
  },
  detailTitle: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.muted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  detailBody: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.fg2,
    lineHeight: 20,
  },
  overlayTextContainer: {
    marginTop: 4,
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    alignItems: 'center',
  },
  overlayTextContent: {
    fontFamily: theme.typography.fonts.mono,
    color: theme.colors.fg,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.xs,
    textAlign: 'center',
  },
  rateCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  rateCardTitle: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.fg,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.sm,
  },
  starRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  starSymbol: {
    fontSize: 28,
    color: theme.colors.border,
  },
  starSymbolActive: {
    color: theme.colors.warn, // Amber #c9822f
  },
  ratingFeedback: {
    fontFamily: theme.typography.fonts.mono,
    color: theme.colors.success,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    marginTop: 8,
  },
  chatSection: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  chatTitle: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg,
  },
  chatDesc: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
    marginBottom: theme.spacing.md,
    marginTop: 2,
  },
  chatBubbleContainer: {
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    maxHeight: 220,
    minHeight: 120,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  chatBubble: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    maxWidth: '85%',
  },
  chatBubbleUser: {
    backgroundColor: theme.colors.accentSecondary,
    alignSelf: 'flex-end',
  },
  chatBubbleModel: {
    backgroundColor: theme.colors.surface,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  chatText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: 13,
    lineHeight: 17,
  },
  chatTextUser: {
    color: theme.colors.accentOn,
    fontWeight: theme.typography.weights.medium,
  },
  chatTextModel: {
    color: theme.colors.fg2,
  },
  chatBubbleLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  chatLoadingText: {
    fontFamily: theme.typography.fonts.mono,
    color: theme.colors.accentSecondary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.fg,
    fontSize: theme.typography.sizes.sm,
  },
  sendButton: {
    height: 40,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.muted,
  },
  sendButtonText: {
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.accentOn,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.xs,
  },
  tabContentArea: {
    flex: 1,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    height: 72,
    borderRadius: 28,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    overflow: 'visible',
  },
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    paddingTop: 10,
    paddingBottom: 16,
    position: 'relative',
  },
  tabBarIcon: {
    fontSize: 20,
    color: theme.colors.muted,
  },
  tabBarIconActive: {
    color: theme.colors.accentSecondary,
  },
  tabBarLabel: {
    fontFamily: theme.typography.fonts.display,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.muted,
    marginTop: 2,
  },
  tabBarLabelActive: {
    color: theme.colors.accentSecondary,
  },
  tabActiveLine: {
    position: 'absolute',
    bottom: 6,
    width: 20,
    height: 3,
    backgroundColor: theme.colors.accentSecondary,
    borderRadius: 1.5,
  },
  tabBarCenterItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
    overflow: 'visible',
    zIndex: 99,
  },
  tabBarCenterButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EC4899',
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -18,
    alignSelf: 'center',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  tabBarCenterButtonActive: {
    backgroundColor: '#DB2777',
    shadowOpacity: 0.6,
  },
  tabBarCenterIcon: {
    fontSize: 22,
    color: '#ffffff',
    lineHeight: Platform.OS === 'ios' ? 24 : 26,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  mockSwitchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  mockSwitchTrackActive: {
    backgroundColor: '#8B5CF6',
  },
  mockSwitchTrackInactive: {
    backgroundColor: '#CBD5E1',
  },
  mockSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  mockSwitchThumbActive: {
    alignSelf: 'flex-end',
  },
  mockSwitchThumbInactive: {
    alignSelf: 'flex-start',
  },
  loadingIdeasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  loadingIdeasText: {
    fontFamily: theme.typography.fonts.mono,
    color: theme.colors.accent,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    marginTop: 12,
  },
  webProgressBarContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  webProgressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  webProgressBarTitle: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.muted,
  },
  webProgressBarBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  webProgressBarBadgeText: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg2,
  },
  webProgressBarTrack: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  webProgressBarFill: {
    width: '0%',
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  webMainHeader: {
    fontFamily: theme.typography.fonts.display,
    fontSize: 28,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.fg,
    textAlign: 'center',
    marginVertical: theme.spacing.lg,
  },
  webNichePillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
  },
  webNichePill: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  webNichePillActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  webNichePillInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: theme.colors.border,
  },
  webNichePillText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  webNichePillTextActive: {
    color: '#FFFFFF',
  },
  webNichePillTextInactive: {
    color: theme.colors.fg2,
  },
  webChatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: '#F3E8FF',
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: theme.spacing.md,
  },
  webChatTextInput: {
    flex: 1,
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.fg,
    paddingVertical: 8,
  },
  webInspireMeBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    marginRight: theme.spacing.sm,
  },
  webInspireMeText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg,
  },
  webSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webSendBtnActive: {
    backgroundColor: '#3B82F6',
  },
  webSendBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  webReferenceVideoLink: {
    alignSelf: 'center',
    marginVertical: theme.spacing.md,
  },
  webReferenceVideoText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: 13,
    fontWeight: theme.typography.weights.bold,
    color: '#94A3B8',
  },
  webReferenceInputWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  webReferenceInput: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.fg,
    paddingVertical: 4,
  },
  tabHeaderContainer: {
    marginBottom: theme.spacing.lg,
  },
  tabTitleHeader: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.fg,
    marginBottom: 4,
  },
  tabDescHeader: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
    lineHeight: 16,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyArchiveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.huge,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.xxl,
  },
  emptyArchiveText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.muted,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  emptyArchiveButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
  emptyArchiveButtonText: {
    fontFamily: theme.typography.fonts.display,
    color: theme.colors.accentOn,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.xs,
  },
  archiveListContainer: {
    gap: theme.spacing.lg,
  },
  archiveCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
  },
  archiveCardActive: {
    borderColor: theme.colors.accent,
    borderWidth: 1.5,
  },
  archiveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  archiveNicheBadge: {
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  archiveNicheText: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 8,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  archiveStars: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.warn,
    letterSpacing: 1,
  },
  archiveStarsEmpty: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 9,
    color: theme.colors.muted,
    fontWeight: theme.typography.weights.bold,
  },
  archiveDate: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 9,
    color: theme.colors.muted,
  },
  archiveTitle: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg,
    marginBottom: 4,
  },
  archiveTopic: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.fg2,
    marginBottom: theme.spacing.md,
  },
  archiveCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingTop: theme.spacing.md,
  },
  archiveActionBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  archiveActionBtnActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  archiveActionText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.fg2,
    fontWeight: theme.typography.weights.bold,
  },
  archiveActionTextActive: {
    color: theme.colors.accentOn,
  },
  archiveDeleteBtn: {
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveDeleteText: {
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.danger,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.xs,
  },
  profileHeaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  profileAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accentSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  profileAvatarText: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.accentOn,
  },
  profileUserEmail: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg,
    marginBottom: 4,
  },
  profileStatusBadge: {
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
  },
  profileStatusText: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 8,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentSecondary,
    letterSpacing: 1.2,
  },
  profileStatsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  profileStatCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileStatValue: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.fg,
    marginBottom: 2,
  },
  profileStatLabel: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 8,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.muted,
    letterSpacing: 1,
  },
  profileSectionTitle: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.muted,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
  },
  profileRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  profileRowLabel: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.fg2,
  },
  profileRowValue: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg,
  },
  profileRowMono: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
    maxWidth: 160,
  },
  profileSignOutBtn: {
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  profileSignOutText: {
    fontFamily: theme.typography.fonts.display,
    color: theme.colors.danger,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.xs,
  },
});

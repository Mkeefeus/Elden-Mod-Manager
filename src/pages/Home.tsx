import {
  Button,
  Group,
  Stack,
  Title,
  Divider,
  useMantineTheme,
  Container,
  ScrollArea,
  Text,
  Paper,
} from '@mantine/core';
import NewsCard from '../components/NewsCard';
import { useElementSize } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { sendLog } from '../utils/rendererLogger';
import { errToString } from '../utils/utilities';
import { decode } from 'he';

const quickActions: { label: string; variant: string }[] = [
  { label: 'Play', variant: 'filled' },
  { label: 'Play Vanilla', variant: 'light' },
];

interface Author {
  name: string;
  avatar_URL: string;
}

interface Categories {
  [key: string]: {
    ID: number;
    name: string;
    description: string;
    parent: number;
    post_count: number;
  };
}

interface UncleanPost {
  title: string;
  content: string;
  featured_image: string;
  author: Author;
  categories: Categories;
  date: string;
}

interface Post {
  title: string;
  body: string;
  imageLink: string;
  author: string;
  authorAvatar: string;
  postCategory: string[];
  postDate: string;
}

interface NewsData {
  posts: UncleanPost[];
}

const Home = () => {
  const theme = useMantineTheme();
  const pageSize = useElementSize();
  const contentSize = useElementSize();

  const cleanHTML = (html: string) => {
    // Remove newlines and all <p> tags
    const cleanedHTML = html.replace(/\n/g, '').replace(/<\/?p>/g, '');
    // Decode HTML entities
    return decode(cleanedHTML);
  };

  const cleanNewsData = (data: NewsData) => {
    const cleanedData = data.posts.map<Post>((post) => {
      const postCategoties = Object.entries(post.categories).map((category) => {
        return category[0];
      });
      return {
        title: post.title,
        body: cleanHTML(post.content),
        imageLink: post.featured_image,
        author: post.author.name,
        authorAvatar: post.author.avatar_URL,
        postCategory: postCategoties,
        postDate: post.date,
      };
    });
    return cleanedData;
  };
  const fetchNews = async () => {
    const response = await fetch('https://public-api.wordpress.com/rest/v1.1/sites/eldenringmm.wordpress.com/posts/');
    const uncleanedData = (await response.json()) as NewsData;
    const cleanedData = cleanNewsData(uncleanedData);
    return cleanedData;
  };
  const {
    data: news,
    isPending,
    error,
    isError,
  } = useQuery<Post[]>({
    queryKey: ['news'],
    queryFn: fetchNews,
  });

  if (error) sendLog({ level: 'error', message: `An error occured while fetching news: ${errToString(error)}` });

  const handleQuckAction = (index: number) => {
    try {
      switch (index) {
        case 0:
          window.electronAPI.launchGame(true);
          break;
        case 1:
          window.electronAPI.launchGame(false);
          break;
      }
    } catch (error) {
      sendLog({
        level: 'error',
        message: `An error occured while performing quick action: ${errToString(error)}`,
      });
    }
  };

  return (
    <Stack gap={'sm'} flex={1} ref={pageSize.ref}>
      <Stack ref={contentSize.ref}>
        <Title order={2}>Quick Actions</Title>
        <Group gap={'lg'} justify="space-between" grow>
          {quickActions.map((action, index) => (
            <Button
              variant={action.variant}
              key={index}
              onClick={() => {
                handleQuckAction(index);
              }}
            >
              {action.label}
            </Button>
          ))}
        </Group>
        <Divider />
        <Title order={4} my={1} m={0} p={0} fs="italic">
          Recent News
        </Title>
      </Stack>
      <Paper withBorder p="xs" bg={theme.colors.dark[8]} shadow="s">
        <ScrollArea.Autosize mah={(pageSize.height - contentSize.height) * 0.8}>
          {isPending ? (
            <Container fluid pl={5}>
              <Text size={theme.fontSizes.md} style={{ marginRight: 'auto' }}>
                Loading...
              </Text>
            </Container>
          ) : isError ? (
            <Container fluid pl={5}>
              <Text size={theme.fontSizes.md} style={{ marginRight: 'auto' }}>
                Error: {error instanceof Error ? error.message : error}
              </Text>
            </Container>
          ) : (
            <Stack gap={'s'}>
              {news?.map((article, index) => {
                return <NewsCard key={index} article={article} />;
              })}
            </Stack>
          )}
        </ScrollArea.Autosize>
      </Paper>
    </Stack>
  );
};

export default Home;

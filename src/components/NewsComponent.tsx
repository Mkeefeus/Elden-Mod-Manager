import { useState } from 'react';
import {
  Title,
  Container,
  Flex,
  Text,
  ScrollArea,
  Divider,
  Group,
  ActionIcon,
  rem,
  useMantineTheme,
  Badge,
  Center,
  Avatar,
} from '@mantine/core';
import classes from './NewsComponent.module.css';
import { IconBookmark, IconHeart, IconShare } from '@tabler/icons-react';
import { useNews } from '@src/providers/NewsProvider';

interface NewsComponentProps {
  title: string;
  body: string;
  imageLink: string;
  author: string;
  authorAvatar: string;
  postCategory: string[];
}

interface ReadMoreStates {
  [index: number]: boolean;
}

const NewsComponent = () => {
  const theme = useMantineTheme();
  const [readMoreStates, setReadMoreStates] = useState<ReadMoreStates>({});

  const { news } = useNews();

  return (
    <>
      <ScrollArea.Autosize mah={290}>
        {news.map((item: NewsComponentProps, index) => {
          const isReadMore = readMoreStates[index] || false;
          return (
            <Container classNames={{ root: classes.newsContainer }} key={index} pl={5}>
              <Flex align="center" justify="space-between" direction={'column'} pr={5} pt={5}>
                <img src={item.imageLink} alt="Mantine logo" className={classes.image} id="featuredImage" />
                <Badge id="badgeTag" variant="gradient" gradient={{ from: 'cyan', to: 'purple' }}>
                  {item.postCategory}
                </Badge>
                <Group gap={8} align="space-between" pb={5} pt={8}>
                  <ActionIcon className={classes.action} color={theme.colors.dark[6]}>
                    <IconHeart style={{ width: rem(16), height: rem(16) }} color={theme.colors.red[6]} />
                  </ActionIcon>
                  <ActionIcon className={classes.action} color={theme.colors.dark[6]}>
                    <IconBookmark style={{ width: rem(16), height: rem(16) }} color={theme.colors.yellow[7]} />
                  </ActionIcon>
                  <ActionIcon className={classes.action} color={theme.colors.dark[6]}>
                    <IconShare style={{ width: rem(16), height: rem(16) }} color={theme.colors.blue[6]} />
                  </ActionIcon>
                </Group>
              </Flex>
              <Divider orientation="vertical" mt={8} mb={8} pr={6} />
              <Group gap={0}>
                <Title order={2}>{item.title}</Title>
                <Text lineClamp={isReadMore ? 100 : 3} style={{ marginRight: 'auto' }}>
                  {item.body}
                </Text>
                <Center mb={isReadMore ? 8 : 0}>
                  <Avatar src={item.authorAvatar} size={22} radius="xl" mr={8} />
                  <Text fz="sm" fs="italic" fw="lighter" inline>
                    {item.author}
                  </Text>
                </Center>
                <Text
                  mb={isReadMore ? 8 : 0}
                  className={classes.readMore}
                  onClick={() =>
                    setReadMoreStates({
                      ...readMoreStates,
                      [index]: !isReadMore,
                    })
                  }
                  style={{
                    marginLeft: 'auto',
                  }}
                >
                  {isReadMore ? 'Read Less' : 'Read More'}
                </Text>
              </Group>
            </Container>
          );
        })}
      </ScrollArea.Autosize>
    </>
  );
};

export default NewsComponent;

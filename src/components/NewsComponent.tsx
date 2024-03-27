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
import { NewsComponentProps } from 'types';

interface ReadMoreStates {
  [index: number]: boolean;
}

function formatISODateToCustom(isoDateString: string): string {
  console.log(isoDateString); // Debug: Inspect the input string (ISO date format)
  const date = new Date(isoDateString);
  console.log(date); // Debug: Inspect the parsed Date object

  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strHours = hours.toString().padStart(2, '0');

  console.log(`${strHours}:${minutes}:${seconds} ${ampm}`); // Debug: Inspect the time components

  return `${month}/${day}/${year} ${strHours}:${minutes}:${seconds} ${ampm}`;
}

const NewsComponent = () => {
  const theme = useMantineTheme();
  const [readMoreStates, setReadMoreStates] = useState<ReadMoreStates>({});

  const { news } = useNews();

  return (
    <>
      <Title order={4} my="xs" m={0} p={0} fs="italic">
        Recent News
      </Title>
      {!news && (
        <Container fluid pl={5}>
          <Text size={theme.fontSizes.md} style={{ marginRight: 'auto' }}>
            Loading...
          </Text>
        </Container>
      )}

      {news && (
        <ScrollArea.Autosize mah={268}>
          {news.map((item, index) => {
            const postDate = formatISODateToCustom(item.postDate);
            const isReadMore = readMoreStates[index] || false;
            return (
              <Container classNames={{ root: classes.newsContainer }} key={index} pl={5}>
                <Flex
                  align="center"
                  justify="space-between"
                  direction={'column'}
                  pr={5}
                  pt={5}
                  className={classes.leftContainer}
                >
                  <img src={item.imageLink} alt="Mantine logo" className={classes.image} id="featuredImage" />
                  <Badge fullWidth id="badgeTag" radius="xs" variant="gradient">
                    {item.postCategory}
                  </Badge>
                  <Group gap={8} align="space-between" pb={5} pt={8}>
                    <ActionIcon className={classes.action} color={theme.colors.dark[6]}>
                      <IconHeart style={{ width: rem(18), height: rem(18) }} color={theme.colors.red[6]} />
                    </ActionIcon>
                    <ActionIcon className={classes.action} color={theme.colors.dark[6]}>
                      <IconBookmark style={{ width: rem(18), height: rem(18) }} color={theme.colors.yellow[7]} />
                    </ActionIcon>
                    <ActionIcon className={classes.action} color={theme.colors.dark[6]}>
                      <IconShare style={{ width: rem(18), height: rem(18) }} color={theme.colors.blue[6]} />
                    </ActionIcon>
                  </Group>
                </Flex>
                <Divider orientation="vertical" mt={8} mb={8} pr={6} />
                <Group gap={0}>
                  <Title order={2}>{item.title}</Title>
                  <Text fs="italic" span style={{ fontSize: '0.65rem', marginLeft: 'auto' }}>
                    {postDate}
                  </Text>
                  <Text size={theme.fontSizes.md} lineClamp={isReadMore ? 100 : 3} style={{ marginRight: 'auto' }}>
                    {item.body}
                  </Text>
                  <Center mb={isReadMore ? 8 : 0}>
                    <Avatar src={item.authorAvatar} size={22} radius="xl" mr={8} />
                    <Text size={theme.fontSizes.xs} fs="italic" fw="lighter" inline>
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
      )}
    </>
  );
};

export default NewsComponent;

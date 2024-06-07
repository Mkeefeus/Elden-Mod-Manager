import { useState } from 'react';
import { Title, Container, Flex, Text, Divider, Group, useMantineTheme, Badge, Avatar, Grid, Box } from '@mantine/core';
import classes from './NewsComponent.module.css';
import { useNews } from '../providers/NewsProvider';

interface ReadMoreStates {
  [index: number]: boolean;
}

const formatISODateToCustom = (isoDateString: string): string => {
  const date = new Date(isoDateString);

  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strHours = hours.toString().padStart(2, '0');

  return `${month}/${day}/${year} ${strHours}:${minutes} ${ampm}`;
};

const NewsComponent = () => {
  const theme = useMantineTheme();
  const [readMoreStates, setReadMoreStates] = useState<ReadMoreStates>({});

  const { news } = useNews();

  return (
    <>
      <Title order={4} my={1} m={0} p={0} fs="italic">
        Recent News
      </Title>
      {!news && (
        <Container fluid pl={5}>
          <Text size={theme.fontSizes.md} style={{ marginRight: 'auto' }}>
            Loading...
          </Text>
        </Container>
      )}

      <Container fluid>
        {news.map((article, index) => {
          const postDate = formatISODateToCustom(article.postDate);
          const isReadMore = readMoreStates[index] || false;
          return (
            <Container fluid bg={theme.colors.dark[8]} className={classes.newsContainer} my="sm" p="xs" key={index}>
              <Grid gutter={0}>
                <Grid.Col
                  span={{
                    sm: 3,
                    xl: 2,
                  }}
                >
                  <Flex align="center" direction={'column'}>
                    <img src={article.imageLink} alt="Mantine logo" className={classes.image} id="featuredImage" />
                    <Badge id="badgeTag" radius="xs" variant="gradient">
                      {article.postCategory}
                    </Badge>
                    <Text fs="italic" span fz="0.65rem" m="auto" pt="xs">
                      {postDate}
                    </Text>
                  </Flex>
                </Grid.Col>

                <Grid.Col
                  span={{
                    sm: 9,
                    xl: 10,
                  }}
                >
                  <Flex align="center" justify="space-between" direction={'row'} pr={5} pt={5}>
                    <Text fz="xl" fs="italic">
                      {article.title}
                    </Text>
                    <Text size="0.6rem" fw="bold">
                      WRITTEN BY
                    </Text>
                    <Group gap={2}>
                      <Avatar src={article.authorAvatar} size="xs" />
                      <Text fz="sm" truncate={true}>
                        {article.author}
                      </Text>
                    </Group>
                  </Flex>

                  <Divider orientation="horizontal" size="xs" pb="sm" />

                  <Text size={theme.fontSizes.md} lineClamp={isReadMore ? 100 : 6} style={{ marginRight: 'auto' }}>
                    {article.body}
                  </Text>
                  {article.body.length > 300 && (
                    <Box h="100%">
                      <Text
                        pt="md"
                        className={classes.readMore}
                        onClick={() =>
                          setReadMoreStates({
                            ...readMoreStates,
                            [index]: !isReadMore,
                          })
                        }
                      >
                        {isReadMore ? 'Read Less' : 'Read More'}
                      </Text>
                    </Box>
                  )}
                </Grid.Col>
              </Grid>
            </Container>
          );
        })}
      </Container>
    </>
  );
};

export default NewsComponent;

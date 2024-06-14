import { Badge, Group, Avatar, Divider, Text, Paper, Spoiler, Stack, Title } from '@mantine/core';
import { NewsComponentProps } from 'types';

interface NewsCardProps {
  article: NewsComponentProps;
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

const NewsCard = ({ article }: NewsCardProps) => {
  return (
    <Paper p={'md'} shadow="xl">
      <Group>
        <Stack align="center" gap={'md'} flex={1}>
          <img src={article.imageLink} alt="Mantine logo" width={130} height={130} id="featuredImage" />
          <Badge id="badgeTag" radius="xs" variant="gradient">
            {article.postCategory}
          </Badge>
          <Text fs="italic" span size="xs">
            {formatISODateToCustom(article.postDate)}
          </Text>
        </Stack>
        <Stack flex={8}>
          <Group align="center" justify="center">
            <Title size="xl" fs="italic">
              {article.title}
            </Title>
            <Group gap={'xs'}>
              <Avatar src={article.authorAvatar} size="xs" />
              <Text size={'small'} truncate={true}>
                {' ' + article.author}
              </Text>
            </Group>
          </Group>
          <Divider orientation="horizontal" size="xs" pb="sm" />
          <Spoiler maxHeight={120} showLabel="Show more" hideLabel="Hide">
            {article.body}
          </Spoiler>
        </Stack>
      </Group>
    </Paper>
  );
};

export default NewsCard;

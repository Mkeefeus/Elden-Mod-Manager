import { Accordion, Text, Title } from '@mantine/core';
import { Dependency } from 'types';

interface LicenseCardProps {
  title: string;
  content: Dependency;
  handleLinkClick: (url: string) => void;
}

const LINK_STYLES = { textDecoration: 'underline', cursor: 'pointer' };

const LicenseCard = ({ title, content, handleLinkClick }: LicenseCardProps) => {
  return (
    <Accordion.Item value={title}>
      <Accordion.Control>{title}</Accordion.Control>
      <Accordion.Panel>
        <Title size="h4">
          Licenses: <Text span>{content.licenses}</Text>
        </Title>
        <Title size="h4">
          License URL:{' '}
          <Text span onClick={() => handleLinkClick(content.licenseUrl)} style={LINK_STYLES}>
            {content.licenseUrl}
          </Text>
        </Title>
        <Title size="h4">
          Repository:{' '}
          <Text span onClick={() => handleLinkClick(content.repository)} style={LINK_STYLES}>
            {content.repository}
          </Text>
        </Title>
      </Accordion.Panel>
    </Accordion.Item>
  );
};
export default LicenseCard;

import { React, useState } from 'react';
import { Title, Container, Flex, Text, Image, ScrollArea } from '@mantine/core';
import classes from './NewsComponent.module.css';

interface NewsComponentProps {
  title: string;
  body: string;
}

const NewsComponent = () => {
  const [readMore, setReadMore] = useState(false);
  const [news, setNews] = useState([
    {
      title: 'New Mod',
      body: 'Oremlay ipsumyay olorday itsay ametyay, onsectetuercay adipiscingyay elityay. Edsay itaevay eolay inyay iamday empersay orttitorpay. Ullamnay idyay augueyay. Aecenasmay atyay acuslay isquay islnay auctoryay imperdietyay. Integeryay incidunttay acinialay elitvay. Uspendissesay aretraphay. Uisday ariusvay. Ellentesquepay abitanthay orbimay istiquetray enectussay etyay etusnay etyay alesuadamay amesfay acyay urpistay egestasyay. Oinpray ullamcorperyay aretraphay uruspay. Ullanay itaevay ortortay. Etiamyay acinialay ictumday anteyay. Ullamnay oremlay igulalay, incidunttay isquay, empustay etyay, osuerepay idyay, isusray. Uncnay itaevay elitvay euyay estyay anditblay iverravay. Uisday osuerepay onguecay ectuslay. Urabiturcay isusray. Uspendissesay accumsanyay olutpatvay agnamay.',
      readMore: readMore,
    },
    {
      title: 'New Feature',
      body: 'Oremlay ipsumyay olorday itsay ametyay, onsectetuercay adipiscingyay elityay. Edsay itaevay eolay inyay iamday empersay orttitorpay. Ullamnay idyay augueyay. Aecenasmay atyay acuslay isquay islnay auctoryay imperdietyay. Integeryay incidunttay acinialay elitvay. Uspendissesay aretraphay. Uisday ariusvay. Ellentesquepay abitanthay orbimay istiquetray enectussay etyay etusnay etyay alesuadamay amesfay acyay urpistay egestasyay. Oinpray ullamcorperyay aretraphay uruspay. Ullanay itaevay ortortay. Etiamyay acinialay ictumday anteyay. Ullamnay oremlay igulalay, incidunttay isquay, empustay etyay, osuerepay idyay, isusray. Uncnay itaevay elitvay euyay estyay anditblay iverravay. Uisday osuerepay onguecay ectuslay. Urabiturcay isusray. Uspendissesay accumsanyay olutpatvay agnamay.',
      readMore: readMore,
    },
    {
      title: 'New Bug Fix',
      body: 'Oremlay ipsumyay olorday itsay ametyay, onsectetuercay adipiscingyay elityay. Edsay itaevay eolay inyay iamday empersay orttitorpay. Ullamnay idyay augueyay. Aecenasmay atyay acuslay isquay islnay auctoryay imperdietyay. Integeryay incidunttay acinialay elitvay. Uspendissesay aretraphay. Uisday ariusvay. Ellentesquepay abitanthay orbimay istiquetray enectussay etyay etusnay etyay alesuadamay amesfay acyay urpistay egestasyay. Oinpray ullamcorperyay aretraphay uruspay. Ullanay itaevay ortortay. Etiamyay acinialay ictumday anteyay. Ullamnay oremlay igulalay, incidunttay isquay, empustay etyay, osuerepay idyay, isusray. Uncnay itaevay elitvay euyay estyay anditblay iverravay. Uisday osuerepay onguecay ectuslay. Urabiturcay isusray. Uspendissesay accumsanyay olutpatvay agnamay.',
      readMore: readMore,
    },
    {
      title: 'New Bug Fix',
      body: 'Oremlay ipsumyay olorday itsay ametyay, onsectetuercay adipiscingyay elityay. Edsay itaevay eolay inyay iamday empersay orttitorpay. Ullamnay idyay augueyay. Aecenasmay atyay acuslay isquay islnay auctoryay imperdietyay. Integeryay incidunttay acinialay elitvay. Uspendissesay aretraphay. Uisday ariusvay. Ellentesquepay abitanthay orbimay istiquetray enectussay etyay etusnay etyay alesuadamay amesfay acyay urpistay egestasyay. Oinpray ullamcorperyay aretraphay uruspay. Ullanay itaevay ortortay. Etiamyay acinialay ictumday anteyay. Ullamnay oremlay igulalay, incidunttay isquay, empustay etyay, osuerepay idyay, isusray. Uncnay itaevay elitvay euyay estyay anditblay iverravay. Uisday osuerepay onguecay ectuslay. Urabiturcay isusray. Uspendissesay accumsanyay olutpatvay agnamay.',
      readMore: readMore,
    },
  ]);

  return (
    <>
      <ScrollArea.Autosize mah={400}>
        {news.map((item: NewsComponentProps) => {
          return (
            <Container classNames={{ root: classes.newsContainer }}>
              <Title order={3}>{item.title}</Title>
              <img
                src="https://placekitten.com/125/125"
                alt="Mantine logo"
                width="80"
                height="80"
                style={{ float: 'left', paddingRight: '10px' }}
              />

              <Text lineClamp={3} style={{ marginRight: 'auto' }}>
                {item.body}
              </Text>
              <Text span>Read More</Text>
            </Container>
          );
        })}
      </ScrollArea.Autosize>
    </>
  );
};

export default NewsComponent;

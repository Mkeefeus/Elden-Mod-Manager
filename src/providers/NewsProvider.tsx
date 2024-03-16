import { useContext, createContext, useEffect, useState, ReactNode, Context } from 'react';

interface NewsComponentProps {
  title: string;
  body: string;
  imageLink: string;
  author: string;
  authorAvatar: string;
  postCategory: string[];
}

interface NewsCtxValue {
  news: NewsComponentProps[];
  setNews: (news: NewsComponentProps[]) => void;
}

const NewsContext = createContext<NewsCtxValue | null>(null);

const cleanNewsData = (data: any) => {
  const cleanedData = data.posts.map((post: any) => {
    let postCategoties = Object.entries(post.categories).map((category: any) => {
      return category[0];
    });
    return {
      title: post.title,
      body: cleanHTML(post.content),
      imageLink: post.featured_image,
      author: post.author.name,
      authorAvatar: post.author.avatar_URL,
      postCategory: postCategoties,
    };
  });
  return cleanedData;
};

const cleanHTML = (html: string) => {
  return html.replace(/<[^>]*>?/gm, '');
};

const NewsProvider = ({ children }: { children: ReactNode }) => {
  const [news, setNews] = useState<NewsComponentProps[]>([]);

  //

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          'https://public-api.wordpress.com/rest/v1.1/sites/eldenringmm.wordpress.com/posts/'
        );
        const data = await response.json();
        setNews(cleanNewsData(data));
      } catch (error) {
        console.error('Error fetching news data', error);
      }
    };
    fetchData();
  }, []);

  return <NewsContext.Provider value={{ news, setNews }}>{children}</NewsContext.Provider>;
};

export default NewsProvider;

export const useNews = () => useContext<NewsCtxValue>(NewsContext as Context<NewsCtxValue>);

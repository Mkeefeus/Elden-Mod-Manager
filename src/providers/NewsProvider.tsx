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

interface Post {
  title: string;
  content: string;
  featured_image: string;
  author: Author;
  categories: Categories;
  date: string;
}

interface NewsData {
  posts: Post[];
}

const NewsContext = createContext<NewsCtxValue | null>(null);

const cleanNewsData = (data: NewsData) => {
  const cleanedData = data.posts.map((post) => {
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
        const data: NewsData = await response.json();
        console.log(data);
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

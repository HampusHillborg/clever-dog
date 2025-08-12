import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

interface Review {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  profile_photo_url: string;
  relative_time_description: string;
}

interface PlaceDetails {
  result?: {
    name?: string;
    rating?: number;
    reviews?: Review[];
    user_ratings_total?: number;
  };
  status: string;
  error_message?: string;
}

const GoogleReviewsSection = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [placeData, setPlaceData] = useState<{ 
    name?: string; 
    rating?: number;
    total?: number;
  }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        // Use Vercel API route to fetch reviews
        const response = await fetch('/api/google-reviews');
        
        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }

        const data: PlaceDetails = await response.json();
        
        if (data.status === 'OK' && data.result) {
          setPlaceData({
            name: data.result.name,
            rating: data.result.rating,
            total: data.result.user_ratings_total
          });
          
          if (data.result.reviews) {
            // Sort reviews by time (newest first) and take only the latest 3
            const latestReviews = [...data.result.reviews]
              .sort((a, b) => b.time - a.time)
              .slice(0, 3);
              
            setReviews(latestReviews);
          } else {
            setReviews([]);
          }
        } else {
          setError(data.error_message || 'No reviews found');
          setReviews([]);
        }
      } catch (err) {
        console.error('Error fetching Google reviews:', err);
        setError('Failed to load reviews. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-500" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-500" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-yellow-500" />);
      }
    }

    return <div className="flex">{stars}</div>;
  };

  return (
    <section id="reviews" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">{t('reviews.title')}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('reviews.subtitle')}
          </p>
          
          {placeData.name && placeData.rating && (
            <div className="mt-4 flex justify-center items-center gap-2">
              <span className="font-semibold">{placeData.name}</span>
              <div className="flex items-center">
                {renderStars(placeData.rating)}
                <span className="ml-2">{placeData.rating.toFixed(1)}</span>
              </div>
              {placeData.total && (
                <span className="text-sm text-gray-500">
                  ({t('reviews.reviewsCount', { count: placeData.total })})
                </span>
              )}
            </div>
          )}
        </motion.div>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="text-center text-red-500 py-8">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && reviews.length === 0 && (
          <div className="text-center py-8">
            <p>{t('reviews.noReviews')}</p>
          </div>
        )}

        {!loading && !error && reviews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-lg shadow-md"
              >
                <div className="flex items-center mb-4">
                  {review.profile_photo_url && (
                    <img
                      src={review.profile_photo_url}
                      alt={review.author_name}
                      className="w-12 h-12 rounded-full mr-4"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{review.author_name}</h3>
                    <div className="flex items-center">
                      {renderStars(review.rating)}
                      <span className="ml-2 text-gray-500 text-sm">
                        {review.relative_time_description}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600">{review.text}</p>
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <a
            href="https://www.google.com/search?sca_esv=e76af58c9f706ded&hl=sv-SE&gl=se&sxsrf=AHTn8zou7xUyty4iwk2JXbtKGaKNO1XkRQ:1744636529311&q=Clever+Dog,+Malm%C3%B6v%C3%A4gen+7,+245+31+Staffanstorp&si=APYL9bs7Hg2KMLB-4tSoTdxuOx8BdRvHbByC_AuVpNyh0x2KzV7hbGHW4-upnq2sbYXW3bHgrlF10a8zswwG1420CTv9ZdPLm7RB2EjcG5Kpc5mDqob_qzw%3D&uds=ABqPDvy2qu3hKEYvihjSSfbXNyIHobLp5gZWYJ0xH9Zd2fWkh0Ls9M-mw1HuW3hTbQ8LOk6Z8lH0VvaZHHTkjXsjAWJeJFEt4hGR-61NT36vgiF1Wyq7J0qsvG8y8uXOSArp9t51Z330_2Qnxe3VIkHI7EC9r7qiQA&sa=X&ved=2ahUKEwiO3d3EzdeMAxXkQVUIHckVNHcQ3PALegQIHBAE&biw=1494&bih=765&dpr=1.5"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition duration-300"
          >
            {t('reviews.viewAllReviews')}
          </a>
        </div>
      </div>
    </section>
  );
};

export default GoogleReviewsSection; 
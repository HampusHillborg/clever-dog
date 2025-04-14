import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaStar, FaQuoteLeft, FaGoogle } from 'react-icons/fa';

interface TrustBannerProps {
  variant?: 'light' | 'dark';
  className?: string;
  displayReview?: boolean;
  compact?: boolean;
}

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
    user_ratings_total?: number;
    reviews?: Review[];
  };
  status: string;
  error_message?: string;
}

const TrustBanner = ({ 
  variant = 'light', 
  className = '', 
  displayReview = false,
  compact = false
}: TrustBannerProps) => {
  const { t } = useTranslation();
  const [placeData, setPlaceData] = useState<{
    rating?: number;
    total?: number;
    reviews?: Array<{
      author_name: string;
      text: string;
      rating: number;
      time: number;
    }>;
  }>({});
  const [loading, setLoading] = useState(true);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  const textColor = variant === 'light' ? 'text-gray-900' : 'text-white';
  const subtextColor = variant === 'light' ? 'text-gray-700' : 'text-gray-200';
  const starColor = 'text-yellow-500';
  const bgColor = variant === 'light' ? 'bg-white bg-opacity-90' : 'bg-gray-900 bg-opacity-90';

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await fetch('/.netlify/functions/get-google-reviews');
        
        if (response.ok) {
          const data: PlaceDetails = await response.json();
          
          if (data.status === 'OK' && data.result) {
            // Filter reviews with 4+ stars, sort by time (newest first), and take only the latest 3
            const latestReviews = data.result.reviews
              ?.filter(review => review.rating >= 4)
              .sort((a, b) => b.time - a.time)
              .slice(0, 3) || [];
              
            setPlaceData({
              rating: data.result.rating,
              total: data.result.user_ratings_total,
              reviews: latestReviews
            });
          }
        }
      } catch (err) {
        console.error('Error fetching place data for trust banner:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  useEffect(() => {
    if (displayReview && placeData.reviews && placeData.reviews.length > 0) {
      const interval = setInterval(() => {
        setCurrentReviewIndex(prevIndex => 
          prevIndex === placeData.reviews!.length - 1 ? 0 : prevIndex + 1
        );
      }, 8000);
      
      return () => clearInterval(interval);
    }
  }, [displayReview, placeData.reviews]);

  const currentReview = placeData.reviews?.[currentReviewIndex];

  if (loading || !placeData.rating) return null;

  // Create star display
  const renderStars = () => {
    const stars = [];
    const rating = placeData.rating || 0;
    
    for (let i = 0; i < 5; i++) {
      stars.push(
        <FaStar 
          key={i} 
          className={`${i < rating ? starColor : 'text-gray-300'} ${compact ? 'text-xs' : 'text-sm'}`} 
        />
      );
    }
    
    return <div className="flex">{stars}</div>;
  };

  return (
    <div className={`${bgColor} shadow-md rounded-lg ${className}`}>
      {compact ? (
        // Compact version for hero or other space-constrained areas
        <div className="flex items-center justify-center p-2 space-x-2">
          <FaGoogle className={`${textColor} ${compact ? 'text-sm' : 'text-lg'}`} />
          <span className={`font-bold ${textColor} text-sm`}>
            {placeData.rating?.toFixed(1)}
          </span>
          {renderStars()}
          <span className={`${subtextColor} text-xs`}>
            ({placeData.total})
          </span>
        </div>
      ) : (
        // Full version with optional review
        <div className="p-4">
          <div className="flex items-center justify-center space-x-3">
            <FaGoogle className={`${textColor} text-xl`} />
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className={`font-bold ${textColor}`}>
                  {placeData.rating?.toFixed(1)}
                </span>
                {renderStars()}
              </div>
              <span className={`${subtextColor} text-xs`}>
                {t('reviews.reviewsCount', { count: placeData.total })}
              </span>
            </div>
          </div>
          
          {displayReview && currentReview && (
            <motion.div 
              key={currentReviewIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-3 text-center"
            >
              <div className="flex justify-center mb-2">
                <FaQuoteLeft className={`${subtextColor} text-lg`} />
              </div>
              <p className={`${subtextColor} text-sm italic`}>
                "{currentReview.text.length > 120 
                  ? `${currentReview.text.substring(0, 120)}...` 
                  : currentReview.text}"
              </p>
              <p className={`${textColor} text-xs mt-2 font-medium`}>
                {currentReview.author_name}
              </p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrustBanner; 
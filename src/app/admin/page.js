'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Admin() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Articles list & selection
  const [articlesList, setArticlesList] = useState([]);
  const [selectedArticleId, setSelectedArticleId] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Fashion');
  const [author, setAuthor] = useState('');
  const [date, setDate] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Arrange Cards Category state
  const [arrangeCategory, setArrangeCategory] = useState('All');

  // Comic Chapter Pages states
  const [comicPages, setComicPages] = useState([]);
  const [newComicPageUrl, setNewComicPageUrl] = useState('');
  const [isUploadingComicPage, setIsUploadingComicPage] = useState(false);

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Cropping states
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [zoom, setZoom] = useState(1.0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imageAspect, setImageAspect] = useState(4 / 3);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Cover Settings states
  const [activeTab, setActiveTab] = useState('articles'); // 'articles' | 'products' | 'orders' | 'locations' | 'cover'
  const [coverTitle, setCoverTitle] = useState('');
  const [coverIssue, setCoverIssue] = useState('');
  const [coverLabel, setCoverLabel] = useState('');
  const [coverTagline, setCoverTagline] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverSocial, setCoverSocial] = useState('');
  const [coverImage, setCoverImage] = useState('');

  // Shop Products states
  const defaultProductImage = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop';
  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productForm, setProductForm] = useState({
    id: '',
    name: '',
    category: 'Accessories',
    description: '',
    image: defaultProductImage,
    price: '0',
    stock: '0',
    active: true,
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Pickup Locations states
  const [locationsList, setLocationsList] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationOpeningHours, setLocationOpeningHours] = useState('Mon - Sat: 9:00 AM - 6:00 PM');
  const [locationLat, setLocationLat] = useState('');
  const [locationLng, setLocationLng] = useState('');
  const [locationActive, setLocationActive] = useState(true);

  // Shop Orders states
  const [ordersList, setOrdersList] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Events states
  const [eventsList, setEventsList] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventAddress, setEventAddress] = useState('');
  const [eventLat, setEventLat] = useState('');
  const [eventLng, setEventLng] = useState('');
  const [eventHasTickets, setEventHasTickets] = useState(false);
  const [eventTicketPrice, setEventTicketPrice] = useState('5000');
  const [eventDescription, setEventDescription] = useState('');
  const [eventImage, setEventImage] = useState('');
  const [eventActive, setEventActive] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Event Tickets states
  const [ticketsList, setTicketsList] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [resendingTicketId, setResendingTicketId] = useState(null);

  // Fetch cover settings
  useEffect(() => {
    if (status === 'authenticated') {
      fetchCoverSettings();
    }
  }, [status]);

  const fetchCoverSettings = async () => {
    try {
      const res = await fetch('/api/cover');
      if (res.ok) {
        const data = await res.json();
        setCoverTitle(data.title);
        setCoverIssue(data.issue);
        setCoverLabel(data.label);
        setCoverTagline(data.tagline);
        setCoverUrl(data.url);
        setCoverSocial(data.social);
        setCoverImage(data.image);
      }
    } catch (err) {
      console.error('Failed to fetch cover settings:', err);
    }
  };

  const handleSaveCoverSettings = async (e) => {
    e.preventDefault();


    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    try {
      const res = await fetch('/api/cover', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: coverTitle,
          issue: coverIssue,
          label: coverLabel,
          tagline: coverTagline,
          url: coverUrl,
          social: coverSocial,
          image: coverImage,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({ message: 'Cover settings saved successfully!', type: 'success' });
      } else {
        setFeedback({ message: data.error || 'Failed to save cover settings.', type: 'error' });
      }
    } catch (err) {
      console.error('Cover settings save error:', err);
      setFeedback({ message: 'Network error saving cover settings.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Route protection
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch initial data on mount & login success
  useEffect(() => {
    if (status === 'authenticated') {
      fetchArticles();
      fetchProducts();
      fetchPickupLocations();
      fetchOrders();
      fetchEvents();
    }
  }, [status]);

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/articles');
      if (res.ok) {
        const data = await res.json();
        // Sort items locally by their order field ascending
        const sorted = data.sort((a, b) => a.order - b.order);
        setArticlesList(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    }
  };

  // Fetch shop products
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProductsList(data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const updateProductField = (field, value) => {
    setProductForm((current) => ({ ...current, [field]: value }));
  };

  const resetProductForm = () => {
    setSelectedProductId('');
    setProductForm({
      id: '',
      name: '',
      category: 'Accessories',
      description: '',
      image: defaultProductImage,
      price: '0',
      stock: '0',
      active: true,
    });
  };

  const handleSelectProduct = (e) => {
    const val = e.target.value;
    setSelectedProductId(val);
    setFeedback({ message: '', type: '' });

    if (val === 'new' || !val || val === '') {
      resetProductForm();
      if (val === 'new') setSelectedProductId('new');
      return;
    }

    const selected = productsList.find((p) => p.id === val);
    if (selected) {
      setProductForm({
        id: selected.id,
        name: selected.name,
        category: selected.category,
        description: selected.description,
        image: selected.image || defaultProductImage,
        price: String(selected.price),
        stock: String(selected.stock),
        active: selected.active,
      });
    }
  };

  const handleEditProduct = (product) => {
    setSelectedProductId(product.id);
    setProductForm({
      id: product.id,
      name: product.name,
      category: product.category,
      description: product.description,
      image: product.image || defaultProductImage,
      price: String(product.price),
      stock: String(product.stock),
      active: product.active,
    });
    setFeedback({ message: '', type: '' });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.description) {
      setFeedback({ message: 'Product name and description are required.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    try {
      const payload = {
        ...productForm,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
      };

      const method = productForm.id ? 'PUT' : 'POST';
      const res = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product.');
      }

      setFeedback({
        message: productForm.id ? 'Product updated successfully.' : 'Product created successfully.',
        type: 'success',
      });
      resetProductForm();
      await fetchProducts();
    } catch (err) {
      setFeedback({ message: err.message || 'Error saving product.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (idToDelete) => {
    const targetId = idToDelete || productForm.id;
    if (!targetId) return;

    if (!window.confirm('Are you sure you want to delete this product?')) return;

    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete product.');
      }

      setFeedback({ message: 'Product deleted successfully.', type: 'success' });
      if (productForm.id === targetId) resetProductForm();
      await fetchProducts();
    } catch (err) {
      setFeedback({ message: err.message || 'Error deleting product.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch pickup locations
  const fetchPickupLocations = async () => {
    try {
      const res = await fetch('/api/pickup-locations');
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a, b) => a.order - b.order);
        setLocationsList(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch pickup locations:', err);
    }
  };

  // Fetch shop orders
  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrdersList(data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Resend order confirmation email
  const handleResendEmail = async (orderId) => {
    setResendingOrderId(orderId);
    setFeedback({ message: '', type: '' });
    try {
      const res = await fetch(`/api/orders/${orderId}/resend-email`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ message: data.message || 'Confirmation email resent successfully!', type: 'success' });
        if (data.order) {
          setOrdersList((prev) =>
            prev.map((o) => (o.id === orderId ? data.order : o))
          );
        }
      } else {
        setFeedback({ message: data.message || 'Failed to resend confirmation email.', type: 'error' });
        if (data.order) {
          setOrdersList((prev) =>
            prev.map((o) => (o.id === orderId ? data.order : o))
          );
        }
      }
    } catch (err) {
      setFeedback({ message: 'Network error resending email.', type: 'error' });
    } finally {
      setResendingOrderId(null);
    }
  };

  // Fetch event tickets
  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        setTicketsList(data);
      }
    } catch (err) {
      console.error('Failed to fetch event tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  // Resend ticket confirmation email
  const handleResendTicketEmail = async (ticketId) => {
    setResendingTicketId(ticketId);
    setFeedback({ message: '', type: '' });
    try {
      const res = await fetch(`/api/tickets/${ticketId}/resend-email`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ message: data.message || 'Ticket email resent successfully!', type: 'success' });
        if (data.ticket) {
          setTicketsList((prev) =>
            prev.map((t) => (t.id === ticketId ? data.ticket : t))
          );
        }
      } else {
        setFeedback({ message: data.message || 'Failed to resend ticket email.', type: 'error' });
        if (data.ticket) {
          setTicketsList((prev) =>
            prev.map((t) => (t.id === ticketId ? data.ticket : t))
          );
        }
      }
    } catch (err) {
      setFeedback({ message: 'Network error resending ticket email.', type: 'error' });
    } finally {
      setResendingTicketId(null);
    }
  };

  // Fetch events
  const fetchEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const res = await fetch('/api/events?all=true');
      if (res.ok) {
        const data = await res.json();
        setEventsList(data);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const resetEventForm = () => {
    setSelectedEventId('');
    setEventTitle('');
    setEventDate('');
    setEventLocation('');
    setEventAddress('');
    setEventLat('');
    setEventLng('');
    setEventHasTickets(false);
    setEventTicketPrice('5000');
    setEventDescription('');
    setEventImage('');
    setEventActive(true);
  };

  const handleSelectEvent = (e) => {
    const val = e.target.value;
    setSelectedEventId(val);
    setFeedback({ message: '', type: '' });

    if (val === 'new' || !val) {
      resetEventForm();
      if (val === 'new') setSelectedEventId('new');
      return;
    }

    const selected = eventsList.find((ev) => ev.id === val);
    if (selected) {
      setEventTitle(selected.title);
      try {
        const d = new Date(selected.date);
        const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setEventDate(isoLocal);
      } catch {
        setEventDate('');
      }
      setEventLocation(selected.location);
      setEventAddress(selected.address);
      setEventLat(selected.latitude != null ? selected.latitude.toString() : '');
      setEventLng(selected.longitude != null ? selected.longitude.toString() : '');
      setEventHasTickets(Boolean(selected.hasTickets));
      setEventTicketPrice(selected.ticketPrice !== undefined && selected.ticketPrice !== null ? selected.ticketPrice.toString() : '5000');
      setEventDescription(selected.description);
      setEventImage(selected.image || '');
      setEventActive(selected.active);
    }
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    if (!eventTitle || !eventDate || !eventLocation || !eventAddress || !eventDescription) {
      setFeedback({ message: 'Title, Date, Location, Address, and Description are required.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    let latNum = null;
    let lngNum = null;
    if (eventLat !== '' || eventLng !== '') {
      latNum = parseFloat(eventLat);
      lngNum = parseFloat(eventLng);
      if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        setFeedback({
          message: 'Invalid latitude or longitude. Latitude: -90 to 90, Longitude: -180 to 180.',
          type: 'error',
        });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        title: eventTitle,
        date: new Date(eventDate).toISOString(),
        location: eventLocation,
        address: eventAddress,
        latitude: latNum,
        longitude: lngNum,
        hasTickets: eventHasTickets,
        ticketPrice: eventTicketPrice !== '' && !isNaN(parseInt(eventTicketPrice, 10)) ? parseInt(eventTicketPrice, 10) : 0,
        description: eventDescription,
        image: eventImage,
        active: eventActive,
      };

      if (selectedEventId && selectedEventId !== 'new') {
        payload.id = selectedEventId;
      }

      const method = selectedEventId && selectedEventId !== 'new' ? 'PUT' : 'POST';
      const res = await fetch('/api/events', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save event.');
      }

      setFeedback({
        message: selectedEventId && selectedEventId !== 'new' ? 'Event updated successfully.' : 'Event created successfully.',
        type: 'success',
      });
      resetEventForm();
      await fetchEvents();
    } catch (err) {
      setFeedback({ message: err.message || 'Error saving event.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (idToDelete) => {
    const targetId = idToDelete || selectedEventId;
    if (!targetId || targetId === 'new') return;

    if (!window.confirm('Are you sure you want to delete this event? This will also remove its ratings and comments.')) return;

    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    try {
      const res = await fetch(`/api/events?id=${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete event.');
      }

      setFeedback({ message: 'Event deleted successfully.', type: 'success' });
      if (selectedEventId === targetId) resetEventForm();
      await fetchEvents();
    } catch (err) {
      setFeedback({ message: err.message || 'Error deleting event.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="login-wrapper">
        <p style={{ color: 'var(--color-bronze)', fontSize: '1.2rem', letterSpacing: '0.15em' }}>
          LOADING PANEL...
        </p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Handle article selection dropdown change
  const handleSelectArticle = (e) => {
    const val = e.target.value;
    setSelectedArticleId(val);
    setFeedback({ message: '', type: '' });

    if (val === 'new') {
      // Clear fields and set defaults for creating a new article
      setTitle('');
      setCategory('Fashion');
      setAuthor('Written by Sasha K. Vang');
      setDate(
        `Published ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}`
      );
      setContent('');
      setImageUrl('');
      setComicPages([]);
      setNewComicPageUrl('');
      return;
    }

    if (!val || val === '') {
      // Clear fields and lock form if selection is cleared
      setTitle('');
      setCategory('Fashion');
      setAuthor('');
      setDate('');
      setContent('');
      setImageUrl('');
      setComicPages([]);
      setNewComicPageUrl('');
      return;
    }

    // Editing mode: Populate inputs with selected article values
    const selected = articlesList.find((a) => a.id === parseInt(val));
    if (selected) {
      setTitle(selected.title);
      setCategory(selected.category);
      setAuthor(selected.author);
      setDate(selected.date);
      setImageUrl(selected.image);

      if (selected.category?.toLowerCase() === 'comics') {
        try {
          const parsed = JSON.parse(selected.content);
          if (Array.isArray(parsed.pages)) {
            setComicPages(parsed.pages);
            setContent(parsed.synopsis || parsed.description || '');
            return;
          }
        } catch {}
      }
      setComicPages([]);
      setContent(deformatContent(selected.content));
    }
  };

  // Handle image upload select (triggers client-side crop modal first)
  const handleImageUploadSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (activeTab === 'articles' && (!selectedArticleId || selectedArticleId === '')) {
      setFeedback({ message: 'Please select an action first.', type: 'error' });
      return;
    }

    setPendingFile(file);

    const objectUrl = URL.createObjectURL(file);
    const testImg = new Image();
    testImg.onload = () => {
      if (testImg.naturalWidth && testImg.naturalHeight) {
        setImageAspect(testImg.naturalWidth / testImg.naturalHeight);
      }
    };
    testImg.src = objectUrl;

    setCropImageSrc(objectUrl);
    setZoom(1.0);
    setOffset({ x: 0, y: 0 });
    // Reset file input so selecting the same file triggers onChange
    e.target.value = '';
  };

  // Drag-and-pan mouse event handlers for crop preview
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch-drag support for tablets and mobile devices
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  // Perform canvas cropping and upload cropped Blob to Cloudinary
  const handleConfirmCrop = async () => {
    if (!pendingFile || !cropImageSrc) return;

    setIsUploading(true);
    setFeedback({ message: '', type: '' });

    try {
      const img = document.getElementById('crop-target-img');
      const viewport = document.querySelector('.crop-viewport');
      if (!img || !viewport) {
        setIsUploading(false);
        return;
      }

      const isCoverTab = activeTab === 'cover';

      // Cover is 1600x1000 (16:10). Articles, Products, and Events are all 1200x900 (4:3).
      const canvasWidth = isCoverTab ? 1600 : 1200;
      const canvasHeight = isCoverTab ? 1000 : 900;

      // Extract exact subpixel bounds from DOM bounding boxes
      const vpRect = viewport.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      // Uniform scaling factor mapping screen pixels to high-res canvas pixels (preserves 1:1 aspect ratio)
      const scale = canvasWidth / vpRect.width;

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Calculate destination coordinates with 100% aspect ratio fidelity
      const destX = (imgRect.left - vpRect.left) * scale;
      const destY = (imgRect.top - vpRect.top) * scale;
      const destW = imgRect.width * scale;
      const destH = imgRect.height * scale;

      ctx.drawImage(img, destX, destY, destW, destH);

      const fileName = pendingFile.name || 'cropped-image.jpg';

      // Close crop modal
      setCropImageSrc('');
      setPendingFile(null);

      // Convert to Blob and send
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setFeedback({ message: 'Cropping failed.', type: 'error' });
            setIsUploading(false);
            return;
          }

          const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });
          const formData = new FormData();
          formData.append('file', croppedFile);

          try {
            const res = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });

            const data = await res.json();
            if (res.ok && data.url) {
              if (activeTab === 'cover') {
                setCoverImage(data.url);
              } else if (activeTab === 'products') {
                setProductForm((prev) => ({ ...prev, image: data.url }));
              } else if (activeTab === 'events') {
                setEventImage(data.url);
              } else {
                setImageUrl(data.url);
              }
              setFeedback({ message: 'Cropped photo uploaded successfully.', type: 'success' });
            } else {
              setFeedback({ message: data.error || 'Failed to upload photo.', type: 'error' });
            }
          } catch (err) {
            console.error('Upload error:', err);
            setFeedback({ message: 'Network error uploading photo.', type: 'error' });
          } finally {
            setIsUploading(false);
          }
        },
        'image/jpeg',
        0.92
      );
    } catch (err) {
      console.error('handleConfirmCrop error:', err);
      setFeedback({ message: 'Failed to process image crop.', type: 'error' });
      setIsUploading(false);
    }
  };

  const handleCancelCrop = () => {
    setCropImageSrc('');
    setPendingFile(null);
    setZoom(1.0);
    setOffset({ x: 0, y: 0 });
    setIsUploading(false);
  };

  // Convert plain text breaks into premium styled HTML paragraph tags (keeps existing tags intact)
  const formatContent = (text) => {
    const trimmed = text.trim();
    if (trimmed.startsWith('<p>') || trimmed.startsWith('<div') || trimmed.startsWith('<blockquote')) {
      return trimmed;
    }
    return trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((line) => {
        // Replace tabs with 4 HTML non-breaking spaces
        const formattedLine = line.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
        
        // If line starts with a quote character (>), wrap in a blockquote
        if (formattedLine.startsWith('>')) {
          const quoteContent = formattedLine.substring(1).trim();
          return `<blockquote class="reader-quote">${quoteContent}</blockquote>`;
        }
        
        return `<p>${formattedLine}</p>`;
      })
      .join('\n');
  };

  // Convert premium HTML article tags back into plain text breaks for editing
  const deformatContent = (html) => {
    if (!html) return '';
    let text = html;
    // Replace reader-quote with markdown-style blockquote symbol
    text = text.replace(/<blockquote class="reader-quote">([\s\S]*?)<\/blockquote>/gi, '>$1\n\n');
    text = text.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, '>$1\n\n');
    text = text.replace(/<\/p>/g, '\n\n');
    text = text.replace(/<br\s*\/?>/g, '\n');
    // Replace non-breaking space indents back to tabs
    text = text.replace(/&nbsp;&nbsp;&nbsp;&nbsp;/g, '\t');
    text = text.replace(/<\/?[^>]+(>|$)/g, '');
    return text.replace(/\n{3,}/g, '\n\n').trim();
  };

  // Intercept Tab key in textarea to insert indent character instead of shifting focus
  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const value = e.target.value;

      const newValue = value.substring(0, start) + '\t' + value.substring(end);
      setContent(newValue);

      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 1;
      }, 0);
    }
  };

  // Comic chapter page handlers
  const handleUploadComicPageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingComicPage(true);
    setFeedback({ message: '', type: '' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setComicPages((prev) => [...prev, data.url]);
        setFeedback({ message: 'Comic page uploaded successfully.', type: 'success' });
      } else {
        setFeedback({ message: data.error || 'Failed to upload comic page.', type: 'error' });
      }
    } catch (err) {
      console.error('Comic page upload error:', err);
      setFeedback({ message: 'Network error uploading comic page.', type: 'error' });
    } finally {
      setIsUploadingComicPage(false);
      e.target.value = '';
    }
  };

  const handleAddComicPageUrl = () => {
    const trimmed = newComicPageUrl.trim();
    if (!trimmed) return;
    setComicPages((prev) => [...prev, trimmed]);
    setNewComicPageUrl('');
  };

  const handleMoveComicPage = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= comicPages.length) return;
    const newPages = [...comicPages];
    const temp = newPages[index];
    newPages[index] = newPages[targetIndex];
    newPages[targetIndex] = temp;
    setComicPages(newPages);
  };

  const handleRemoveComicPage = (index) => {
    setComicPages((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle article submit (Publish New or Save Changes)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!selectedArticleId || selectedArticleId === '') {
      setFeedback({ message: 'Please select an action (Create or Edit) first.', type: 'error' });
      return;
    }
    if (!imageUrl) {
      setFeedback({ message: 'Please upload a photo for the article first.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    const isComicsCat = category.toLowerCase() === 'comics';
    const formattedContent = isComicsCat
      ? JSON.stringify({
          synopsis: content,
          pages: comicPages,
        })
      : formatContent(content);
    const isEditing = selectedArticleId !== 'new';

    const url = '/api/articles';
    const method = isEditing ? 'PUT' : 'POST';
    const body = isEditing
      ? {
          id: selectedArticleId,
          title,
          category,
          author,
          date,
          image: imageUrl,
          content: formattedContent,
        }
      : {
          title,
          category,
          author,
          date,
          image: imageUrl,
          content: formattedContent,
        };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({
          message: isEditing ? 'Changes saved successfully!' : 'Article published successfully!',
          type: 'success',
        });

        if (!isEditing) {
          // Clear fields on successful creation
          setTitle('');
          setContent('');
          setImageUrl('');
          setSelectedArticleId('');
          setComicPages([]);
          setNewComicPageUrl('');
        }

        // Refresh articles list to update dropdown & reorder layout
        await fetchArticles();
      } else {
        setFeedback({ message: data.error || 'Failed to save article.', type: 'error' });
      }
    } catch (err) {
      setFeedback({ message: 'Network error saving article.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle article deletion
  const handleDelete = async () => {
    if (!selectedArticleId || selectedArticleId === 'new') return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this article? This action cannot be undone.'
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    try {
      const res = await fetch(`/api/articles?id=${selectedArticleId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({ message: 'Article deleted successfully.', type: 'success' });
        // Clear fields
        setTitle('');
        setCategory('Fashion');
        setAuthor('');
        setDate('');
        setContent('');
        setImageUrl('');
        setSelectedArticleId('');
        setComicPages([]);
        setNewComicPageUrl('');
        // Refresh dropdown & reorder list
        await fetchArticles();
      } else {
        setFeedback({ message: data.error || 'Failed to delete article.', type: 'error' });
      }
    } catch (err) {
      setFeedback({ message: 'Network error deleting article.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle layout card reordering (Up/Down) with Category selection
  const handleMove = async (index, direction) => {
    const norm = (cat) => cat?.toLowerCase().replace(/\s+/g, '') || '';
    const displayedList = arrangeCategory === 'All'
      ? articlesList
      : articlesList.filter((a) => norm(a.category) === norm(arrangeCategory));

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= displayedList.length) return;

    const currentArt = displayedList[index];
    const targetArt = displayedList[targetIndex];

    const fullCurrentIdx = articlesList.findIndex((a) => a.id === currentArt.id);
    const fullTargetIdx = articlesList.findIndex((a) => a.id === targetArt.id);

    if (fullCurrentIdx === -1 || fullTargetIdx === -1) return;

    const newList = [...articlesList];
    const temp = newList[fullCurrentIdx];
    newList[fullCurrentIdx] = newList[fullTargetIdx];
    newList[fullTargetIdx] = temp;

    // Update local state instantly for fast UI feedback
    setArticlesList(newList);

    // Map new ordering indices
    const updatedOrders = newList.map((item, idx) => ({
      id: item.id,
      order: idx,
    }));

    try {
      const res = await fetch('/api/articles', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orders: updatedOrders }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFeedback({ message: data.error || 'Failed to save layout order.', type: 'error' });
        await fetchArticles();
      }
    } catch (err) {
      setFeedback({ message: 'Network error saving layout order.', type: 'error' });
      await fetchArticles();
    }
  };

  const isFormEnabled = selectedArticleId && selectedArticleId !== '';

  // Pickup Location handlers
  const handleSelectLocation = (e) => {
    const val = e.target.value;
    setSelectedLocationId(val);
    setFeedback({ message: '', type: '' });

    if (val === 'new') {
      setLocationName('');
      setLocationAddress('');
      setLocationOpeningHours('Mon - Sat: 9:00 AM - 6:00 PM');
      setLocationLat('');
      setLocationLng('');
      setLocationActive(true);
      return;
    }

    if (!val || val === '') {
      setLocationName('');
      setLocationAddress('');
      setLocationOpeningHours('Mon - Sat: 9:00 AM - 6:00 PM');
      setLocationLat('');
      setLocationLng('');
      setLocationActive(true);
      return;
    }

    const selected = locationsList.find((l) => l.id === val);
    if (selected) {
      setLocationName(selected.name);
      setLocationAddress(selected.address);
      setLocationOpeningHours(selected.openingHours || 'Mon - Sat: 9:00 AM - 6:00 PM');
      setLocationLat(selected.latitude.toString());
      setLocationLng(selected.longitude.toString());
      setLocationActive(selected.active);
    }
  };

  const handleSubmitLocation = async (e) => {
    e.preventDefault();
    if (!locationName || !locationAddress || !locationLat || !locationLng) {
      setFeedback({ message: 'All fields are required.', type: 'error' });
      return;
    }

    const latNum = parseFloat(locationLat);
    const lngNum = parseFloat(locationLng);
    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      setFeedback({ 
        message: 'Invalid latitude or longitude. Latitude: -90 to 90, Longitude: -180 to 180.', 
        type: 'error' 
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    try {
      if (selectedLocationId === 'new') {
        const res = await fetch('/api/pickup-locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: locationName,
            address: locationAddress,
            openingHours: locationOpeningHours || 'Mon - Sat: 9:00 AM - 6:00 PM',
            latitude: latNum,
            longitude: lngNum,
            active: locationActive,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setFeedback({ message: 'Pickup location created successfully!', type: 'success' });
          setLocationName('');
          setLocationAddress('');
          setLocationOpeningHours('Mon - Sat: 9:00 AM - 6:00 PM');
          setLocationLat('');
          setLocationLng('');
          setLocationActive(true);
          setSelectedLocationId('');
          await fetchPickupLocations();
        } else {
          setFeedback({ message: data.error || 'Failed to create location.', type: 'error' });
        }
      } else {
        const res = await fetch('/api/pickup-locations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedLocationId,
            name: locationName,
            address: locationAddress,
            openingHours: locationOpeningHours || 'Mon - Sat: 9:00 AM - 6:00 PM',
            latitude: latNum,
            longitude: lngNum,
            active: locationActive,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setFeedback({ message: 'Pickup location updated successfully!', type: 'success' });
          await fetchPickupLocations();
        } else {
          setFeedback({ message: data.error || 'Failed to update location.', type: 'error' });
        }
      }
    } catch (err) {
      setFeedback({ message: 'Network error saving location.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!selectedLocationId || selectedLocationId === 'new') {
      setFeedback({ message: 'Please select a location to delete.', type: 'error' });
      return;
    }

    if (!window.confirm('Are you sure you want to delete this pickup location?')) return;

    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    try {
      const res = await fetch(`/api/pickup-locations?id=${selectedLocationId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({ message: 'Pickup location deleted successfully.', type: 'success' });
        setLocationName('');
        setLocationAddress('');
        setLocationLat('');
        setLocationLng('');
        setLocationActive(true);
        setSelectedLocationId('');
        await fetchPickupLocations();
      } else {
        setFeedback({ message: data.error || 'Failed to delete location.', type: 'error' });
      }
    } catch (err) {
      setFeedback({ message: 'Network error deleting location.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveLocation = async (index, direction) => {
    const newList = [...locationsList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newList.length) return;

    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    setLocationsList(newList);

    const updatedOrders = newList.map((item, idx) => ({
      id: item.id,
      order: idx,
    }));

    try {
      const res = await fetch('/api/pickup-locations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: updatedOrders }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFeedback({ message: data.error || 'Failed to save location order.', type: 'error' });
        await fetchPickupLocations();
      }
    } catch (err) {
      setFeedback({ message: 'Network error saving location order.', type: 'error' });
      await fetchPickupLocations();
    }
  };

  const isLocationFormEnabled = selectedLocationId && selectedLocationId !== '';

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1 className="admin-title">SLEEK PANEL</h1>
        <button className="logout-btn" onClick={() => signOut({ callbackUrl: '/login' })}>
          LOG OUT
        </button>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--color-border)', marginBottom: '3rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => { setActiveTab('articles'); setFeedback({ message: '', type: '' }); }}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'articles' ? 'var(--color-bronze)' : 'var(--color-muted)',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            padding: '1rem 0',
            borderBottom: activeTab === 'articles' ? '2px solid var(--color-bronze)' : '2px solid transparent',
            cursor: 'pointer',
            textTransform: 'uppercase'
          }}
        >
          Articles Feed
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('cover'); setFeedback({ message: '', type: '' }); }}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'cover' ? 'var(--color-bronze)' : 'var(--color-muted)',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            padding: '1rem 0',
            borderBottom: activeTab === 'cover' ? '2px solid var(--color-bronze)' : '2px solid transparent',
            cursor: 'pointer',
            textTransform: 'uppercase'
          }}
        >
          Cover Settings
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('products'); fetchProducts(); setFeedback({ message: '', type: '' }); }}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'products' ? 'var(--color-bronze)' : 'var(--color-muted)',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            padding: '1rem 0',
            borderBottom: activeTab === 'products' ? '2px solid var(--color-bronze)' : '2px solid transparent',
            cursor: 'pointer',
            textTransform: 'uppercase'
          }}
        >
          Shop Products
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('events'); fetchEvents(); setFeedback({ message: '', type: '' }); }}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'events' ? 'var(--color-bronze)' : 'var(--color-muted)',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            padding: '1rem 0',
            borderBottom: activeTab === 'events' ? '2px solid var(--color-bronze)' : '2px solid transparent',
            cursor: 'pointer',
            textTransform: 'uppercase'
          }}
        >
          Events
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('orders'); fetchOrders(); setFeedback({ message: '', type: '' }); }}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'orders' ? 'var(--color-bronze)' : 'var(--color-muted)',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            padding: '1rem 0',
            borderBottom: activeTab === 'orders' ? '2px solid var(--color-bronze)' : '2px solid transparent',
            cursor: 'pointer',
            textTransform: 'uppercase'
          }}
        >
          Shop Orders
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('tickets'); fetchTickets(); setFeedback({ message: '', type: '' }); }}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'tickets' ? 'var(--color-bronze)' : 'var(--color-muted)',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            padding: '1rem 0',
            borderBottom: activeTab === 'tickets' ? '2px solid var(--color-bronze)' : '2px solid transparent',
            cursor: 'pointer',
            textTransform: 'uppercase'
          }}
        >
          Event Tickets
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('locations'); fetchPickupLocations(); setFeedback({ message: '', type: '' }); }}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'locations' ? 'var(--color-bronze)' : 'var(--color-muted)',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            padding: '1rem 0',
            borderBottom: activeTab === 'locations' ? '2px solid var(--color-bronze)' : '2px solid transparent',
            cursor: 'pointer',
            textTransform: 'uppercase'
          }}
        >
          Pickup Locations
        </button>
      </div>

      {activeTab === 'articles' ? (
        <>
          {/* Editor selector dropdown */}
          <div className="form-group" style={{ marginBottom: '3rem', maxWidth: '500px' }}>
            <label htmlFor="article-select" style={{ fontSize: '0.8rem', color: 'var(--color-bronze)' }}>
              Select Article Action
            </label>
            <select
              id="article-select"
              className="form-select"
              value={selectedArticleId}
              onChange={handleSelectArticle}
              style={{ marginTop: '0.5rem', border: '1px solid var(--color-bronze)' }}
            >
              <option value="">-- Choose an action --</option>
              <option value="new">+ Create New Article</option>
              <optgroup label="Edit Existing Articles">
                {articlesList.map((art) => (
                  <option key={art.id} value={art.id}>
                    {art.title} ({art.category})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="admin-grid" style={{ opacity: isFormEnabled ? 1 : 0.4, transition: 'opacity 0.3s' }}>
            {/* Left Column: Edit/Write Form */}
            <div>
              <h2 className="subtitle-tag" style={{ marginBottom: '2rem' }}>
                {selectedArticleId === 'new' ? 'Create Article Details' : 'Edit Article Details'}
              </h2>
              <form onSubmit={handleSubmitForm} className="editor-form">
                <div className="form-group">
                  <label htmlFor="title">Title</label>
                  <input
                    id="title"
                    type="text"
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={!isFormEnabled || isSubmitting}
                    placeholder={isFormEnabled ? 'e.g. Concrete & Silk' : 'Choose an action first...'}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={!isFormEnabled || isSubmitting}
                  >
                    <option value="Fashion">Fashion</option>
                    <option value="Culture">Culture</option>
                    <option value="Sleek Peak">Sleek Peak</option>
                    <option value="Sports">Sports</option>
                    <option value="Business News">Business News</option>
                    <option value="Comics">Comics</option>
                    <option value="Editorial">Editorial</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="author">Author Attribution</label>
                  <input
                    id="author"
                    type="text"
                    className="form-input"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    required
                    disabled={!isFormEnabled || isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="date">Publication Date Text</label>
                  <input
                    id="date"
                    type="text"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    disabled={!isFormEnabled || isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="content">
                    {category.toLowerCase() === 'comics' ? 'Comic Chapter Synopsis' : 'Content'}
                  </label>
                  <textarea
                    id="content"
                    className="form-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    required
                    disabled={!isFormEnabled || isSubmitting}
                    placeholder={
                      isFormEnabled
                        ? category.toLowerCase() === 'comics'
                          ? 'Write a brief summary or storyline synopsis of this comic chapter...'
                          : 'Write your text paragraphs here...'
                        : 'Choose an action first...'
                    }
                  />
                </div>

                {/* Comic Chapter Pages Manager (Only when category is Comics) */}
                {category.toLowerCase() === 'comics' && (
                  <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--color-bronze)', backgroundColor: 'var(--color-black-card)' }}>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--color-bronze)', marginBottom: '0.5rem' }}>
                      Comic Chapter Pages (Reader Feature)
                    </h3>
                    <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                      Upload the sequential pages of this comic chapter. Readers will swipe through these pages on /comics.
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.6rem 1.2rem',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--color-bronze)',
                          color: 'var(--color-bronze)',
                          fontSize: '0.75rem',
                          letterSpacing: '0.1em',
                          cursor: isUploadingComicPage ? 'not-allowed' : 'pointer',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={!isFormEnabled || isUploadingComicPage || isSubmitting}
                          onChange={handleUploadComicPageFile}
                        />
                        {isUploadingComicPage ? 'Uploading Page...' : '+ Upload Comic Page'}
                      </label>

                      <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
                        <input
                          type="text"
                          placeholder="Or paste page image URL..."
                          className="form-input"
                          value={newComicPageUrl}
                          onChange={(e) => setNewComicPageUrl(e.target.value)}
                          disabled={!isFormEnabled || isSubmitting}
                          style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                        />
                        <button
                          type="button"
                          onClick={handleAddComicPageUrl}
                          disabled={!isFormEnabled || !newComicPageUrl.trim() || isSubmitting}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-white)',
                            padding: '0 1rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {comicPages.length === 0 ? (
                      <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        No separate chapter pages added yet. The cover photo above will be displayed as Page 1.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {comicPages.map((pageUrl, pIdx) => (
                          <div
                            key={pIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.6rem 1rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                              <span style={{ color: 'var(--color-bronze)', fontSize: '0.8rem', fontWeight: 600, width: '60px' }}>
                                Page {pIdx + 1}
                              </span>
                              <img
                                src={pageUrl}
                                alt={`Page ${pIdx + 1}`}
                                style={{ width: '36px', height: '48px', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                              />
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--color-muted)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '280px',
                                }}
                              >
                                {pageUrl}
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => handleMoveComicPage(pIdx, 'up')}
                                disabled={pIdx === 0}
                                style={{
                                  background: 'none',
                                  border: '1px solid var(--color-border)',
                                  color: 'var(--color-white)',
                                  padding: '0.2rem 0.5rem',
                                  cursor: pIdx === 0 ? 'not-allowed' : 'pointer',
                                  opacity: pIdx === 0 ? 0.3 : 1,
                                  fontSize: '0.7rem',
                                }}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveComicPage(pIdx, 'down')}
                                disabled={pIdx === comicPages.length - 1}
                                style={{
                                  background: 'none',
                                  border: '1px solid var(--color-border)',
                                  color: 'var(--color-white)',
                                  padding: '0.2rem 0.5rem',
                                  cursor: pIdx === comicPages.length - 1 ? 'not-allowed' : 'pointer',
                                  opacity: pIdx === comicPages.length - 1 ? 0.3 : 1,
                                  fontSize: '0.7rem',
                                }}
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveComicPage(pIdx)}
                                style={{
                                  background: 'none',
                                  border: '1px solid rgba(220, 50, 50, 0.4)',
                                  color: '#ff6b6b',
                                  padding: '0.2rem 0.5rem',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem',
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {feedback.message && (
                  <div className={`admin-feedback ${feedback.type}`}>{feedback.message}</div>
                )}

                <div className="admin-button-group">
                  <button
                    type="submit"
                    className="publish-btn"
                    style={{ flex: 1 }}
                    disabled={!isFormEnabled || isSubmitting || isUploading}
                  >
                    {selectedArticleId === 'new'
                      ? isSubmitting
                        ? 'PUBLISHING...'
                        : 'PUBLISH ARTICLE'
                      : isSubmitting
                      ? 'SAVING...'
                      : 'SAVE CHANGES'}
                  </button>

                  {selectedArticleId && selectedArticleId !== 'new' && (
                    <button
                      type="button"
                      className="delete-btn"
                      style={{ flex: 1 }}
                      onClick={handleDelete}
                      disabled={isSubmitting || isUploading}
                    >
                      {isSubmitting ? 'DELETING...' : 'DELETE ARTICLE'}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right Column: Image Uploader & Preview */}
            <div>
              <h2 className="subtitle-tag" style={{ marginBottom: '2rem' }}>
                Article Photo
              </h2>

              <div className="form-group">
                <label>Upload Image (4:3 Aspect Ratio)</label>
                <label
                  className="upload-zone"
                  style={{
                    cursor: isFormEnabled ? 'pointer' : 'not-allowed',
                    pointerEvents: isFormEnabled ? 'auto' : 'none',
                  }}
                >
                  <input
                    id="upload-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUploadSelect}
                    style={{ display: 'none' }}
                    disabled={!isFormEnabled || isUploading || isSubmitting}
                  />
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-bronze)"
                    strokeWidth="1.5"
                    style={{ marginBottom: '0.5rem' }}
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  <span className="upload-text">
                    {!isFormEnabled
                      ? 'Select an action first to upload photo'
                      : isUploading
                      ? 'Uploading to Cloudinary...'
                      : imageUrl
                      ? 'Click to change photo'
                      : 'Click to upload editorial photo'}
                  </span>
                </label>

                {imageUrl && (
                  <div className="form-group" style={{ marginTop: '2rem' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Photo Preview</span>
                      <button
                        type="button"
                        onClick={() => document.getElementById('upload-file-input').click()}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-bronze)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0
                        }}
                      >
                        Change Photo
                      </button>
                    </label>
                    <div className="upload-preview">
                      <img src={imageUrl} alt="Uploaded preview" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reordering list panel */}
          {articlesList.length > 0 && (
            <div style={{ marginTop: '6rem', borderTop: '1px solid var(--color-border)', paddingTop: '4rem' }}>
              <h2 className="subtitle-tag" style={{ marginBottom: '1.5rem' }}>
                Arrange Cards Layout
              </h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
                Select a category to view and arrange its articles, or choose "All Categories". Use the up (▲) and down (▼) buttons to reorder how the article cards are displayed on the main feed.
              </p>

              {/* Category Selector for Arrangement (retaining the exact same design) */}
              <div className="form-group" style={{ marginBottom: '2rem', maxWidth: '350px' }}>
                <label htmlFor="arrange-category" style={{ fontSize: '0.8rem', color: 'var(--color-bronze)' }}>
                  Category
                </label>
                <select
                  id="arrange-category"
                  className="form-select"
                  value={arrangeCategory}
                  onChange={(e) => setArrangeCategory(e.target.value)}
                  style={{ marginTop: '0.5rem', border: '1px solid var(--color-border)' }}
                >
                  <option value="All">All Categories</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Sports">Sports</option>
                  <option value="Sleek Peak">Sleek Peak</option>
                  <option value="Culture">Culture</option>
                  <option value="Editorial">Editorial</option>
                  <option value="Business News">Business News</option>
                  <option value="Comics">Comics</option>
                </select>
              </div>

              {(() => {
                const norm = (cat) => cat?.toLowerCase().replace(/\s+/g, '') || '';
                const displayedList = arrangeCategory === 'All'
                  ? articlesList
                  : articlesList.filter((a) => norm(a.category) === norm(arrangeCategory));

                if (displayedList.length === 0) {
                  return (
                    <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '1rem 0' }}>
                      No articles published in {arrangeCategory} category yet.
                    </p>
                  );
                }

                return (
                  <div
                    className="reorder-list"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      maxWidth: '650px',
                    }}
                  >
                    {displayedList.map((art, idx) => (
                      <div
                        key={art.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '1.2rem 1.5rem',
                          backgroundColor: 'var(--color-black-card)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <span
                            style={{
                              color: 'var(--color-bronze)',
                              fontSize: '0.85rem',
                              fontFamily: 'var(--font-serif)',
                              width: '25px',
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{art.title}</span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: 'var(--color-muted)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            ({art.category})
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'up')}
                            disabled={idx === 0 || isSubmitting}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-white)',
                              padding: '0.4rem 0.8rem',
                              cursor: idx === 0 ? 'not-allowed' : 'pointer',
                              opacity: idx === 0 ? 0.3 : 1,
                            }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'down')}
                            disabled={idx === displayedList.length - 1 || isSubmitting}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-white)',
                              padding: '0.4rem 0.8rem',
                              cursor: idx === displayedList.length - 1 ? 'not-allowed' : 'pointer',
                              opacity: idx === displayedList.length - 1 ? 0.3 : 1,
                            }}
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </>
      ) : activeTab === 'locations' ? (
        <>
          {/* Pickup Locations Selector */}
          <div className="form-group" style={{ marginBottom: '3rem', maxWidth: '500px' }}>
            <label htmlFor="location-select" style={{ fontSize: '0.8rem', color: 'var(--color-bronze)' }}>
              Select Location Action
            </label>
            <select
              id="location-select"
              className="form-select"
              value={selectedLocationId}
              onChange={handleSelectLocation}
              style={{ marginTop: '0.5rem', border: '1px solid var(--color-bronze)' }}
            >
              <option value="">-- Choose an action --</option>
              <option value="new">+ Add New Location</option>
              <optgroup label="Edit Locations">
                {locationsList.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.active ? 'Active' : 'Inactive'})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="admin-grid" style={{ opacity: isLocationFormEnabled ? 1 : 0.4, transition: 'opacity 0.3s' }}>
            {/* Left Column: Location Form */}
            <div>
              <h2 className="subtitle-tag" style={{ marginBottom: '2rem' }}>
                {selectedLocationId === 'new' ? 'Add New Location' : 'Edit Location'}
              </h2>
              <form onSubmit={handleSubmitLocation} className="editor-form">
                <div className="form-group">
                  <label htmlFor="locName">Location Name</label>
                  <input
                    id="locName"
                    type="text"
                    className="form-input"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Downtown Store"
                    disabled={!isLocationFormEnabled || isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="locAddress">Address</label>
                  <input
                    id="locAddress"
                    type="text"
                    className="form-input"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="e.g. 123 Main St, Lagos"
                    disabled={!isLocationFormEnabled || isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="locHours">Opening Hours</label>
                  <input
                    id="locHours"
                    type="text"
                    className="form-input"
                    value={locationOpeningHours}
                    onChange={(e) => setLocationOpeningHours(e.target.value)}
                    placeholder="e.g. Mon - Sat: 9:00 AM - 6:00 PM"
                    disabled={!isLocationFormEnabled || isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="locLat">Latitude</label>
                  <input
                    id="locLat"
                    type="number"
                    step="0.00001"
                    className="form-input"
                    value={locationLat}
                    onChange={(e) => setLocationLat(e.target.value)}
                    placeholder="e.g. 6.5244"
                    disabled={!isLocationFormEnabled || isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="locLng">Longitude</label>
                  <input
                    id="locLng"
                    type="number"
                    step="0.00001"
                    className="form-input"
                    value={locationLng}
                    onChange={(e) => setLocationLng(e.target.value)}
                    placeholder="e.g. 3.3792"
                    disabled={!isLocationFormEnabled || isSubmitting}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    id="locActive"
                    type="checkbox"
                    checked={locationActive}
                    onChange={(e) => setLocationActive(e.target.checked)}
                    disabled={!isLocationFormEnabled || isSubmitting}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <label htmlFor="locActive" style={{ margin: 0, cursor: 'pointer' }}>
                    Active (show to public)
                  </label>
                </div>

                <div className="admin-button-group">
                  <button
                    type="submit"
                    className="publish-btn"
                    disabled={!isLocationFormEnabled || isSubmitting}
                  >
                    {isSubmitting ? 'SAVING...' : 'SAVE LOCATION'}
                  </button>
                  {selectedLocationId !== '' && selectedLocationId !== 'new' && (
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={handleDeleteLocation}
                      disabled={isSubmitting}
                    >
                      DELETE
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right Column: Locations List & Reordering */}
            <div>
              <h2 className="subtitle-tag" style={{ marginBottom: '2rem' }}>
                Manage Locations
              </h2>

              {locationsList.length === 0 ? (
                <p style={{ color: 'var(--color-muted)' }}>No pickup locations yet. Create one to get started.</p>
              ) : (
                <div>
                  {locationsList.map((location, idx) => (
                    <div
                      key={location.id}
                      className="admin-article-item"
                      onClick={() => {
                        setSelectedLocationId(location.id);
                        setFeedback({ message: '', type: '' });
                        setLocationName(location.name);
                        setLocationAddress(location.address);
                        setLocationOpeningHours(location.openingHours || 'Mon - Sat: 9:00 AM - 6:00 PM');
                        setLocationLat(location.latitude.toString());
                        setLocationLng(location.longitude.toString());
                        setLocationActive(location.active);
                      }}
                      style={{
                        padding: '1rem',
                        marginBottom: '0.5rem',
                        borderLeft: selectedLocationId === location.id ? '3px solid var(--color-bronze)' : '3px solid transparent',
                        cursor: 'pointer',
                        backgroundColor: selectedLocationId === location.id ? '#fafafa' : 'white',
                      }}
                    >
                      <p style={{ margin: '0 0 0.25rem 0', fontWeight: '600', fontSize: '0.95rem' }}>
                        {location.name}
                      </p>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#666' }}>
                        {location.address}
                      </p>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--color-bronze)' }}>
                        🕒 {location.openingHours || 'Mon - Sat: 9:00 AM - 6:00 PM'}
                      </p>
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#999' }}>
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="admin-move-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveLocation(idx, 'up');
                          }}
                          disabled={idx === 0}
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.75rem',
                            opacity: idx === 0 ? 0.5 : 1,
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="admin-move-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveLocation(idx, 'down');
                          }}
                          disabled={idx === locationsList.length - 1}
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.75rem',
                            opacity: idx === locationsList.length - 1 ? 0.5 : 1,
                          }}
                        >
                          ↓
                        </button>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginLeft: 'auto' }}>
                          {location.active ? '✓ Active' : '○ Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : activeTab === 'orders' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="subtitle-tag" style={{ margin: 0 }}>
                Shop Orders ({ordersList.length})
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                Customer purchase records, selected pickup hubs, and email delivery statuses.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search reference, email, product..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="form-input"
                style={{ width: '280px', padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
              />
              <button
                type="button"
                className="publish-btn"
                onClick={fetchOrders}
                disabled={isLoadingOrders}
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                {isLoadingOrders ? 'REFRESHING...' : 'REFRESH'}
              </button>
            </div>
          </div>

          {feedback.message && (
            <div className={`admin-feedback ${feedback.type}`} style={{ marginBottom: '1.5rem' }}>
              {feedback.message}
            </div>
          )}

          {isLoadingOrders && ordersList.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '3rem 0' }}>Loading orders...</p>
          ) : ordersList.filter((order) => {
              if (!orderSearchQuery.trim()) return true;
              const q = orderSearchQuery.toLowerCase();
              return (
                order.orderReference?.toLowerCase().includes(q) ||
                order.email?.toLowerCase().includes(q) ||
                order.productName?.toLowerCase().includes(q) ||
                order.pickupLocationName?.toLowerCase().includes(q)
              );
            }).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-muted)', border: '1px dashed var(--color-border)', borderRadius: '8px' }}>
              <p style={{ margin: 0 }}>{orderSearchQuery ? 'No orders match your search criteria.' : 'No shop orders recorded yet.'}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-black-card)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <th style={{ padding: '1rem 1.2rem', color: 'var(--color-bronze)', fontWeight: 600, letterSpacing: '0.05em' }}>ORDER REF</th>
                    <th style={{ padding: '1rem 1.2rem', color: 'var(--color-bronze)', fontWeight: 600, letterSpacing: '0.05em' }}>CUSTOMER EMAIL</th>
                    <th style={{ padding: '1rem 1.2rem', color: 'var(--color-bronze)', fontWeight: 600, letterSpacing: '0.05em' }}>PRODUCT</th>
                    <th style={{ padding: '1rem 1.2rem', color: 'var(--color-bronze)', fontWeight: 600, letterSpacing: '0.05em' }}>PRICE</th>
                    <th style={{ padding: '1rem 1.2rem', color: 'var(--color-bronze)', fontWeight: 600, letterSpacing: '0.05em' }}>PICKUP LOCATION</th>
                    <th style={{ padding: '1rem 1.2rem', color: 'var(--color-bronze)', fontWeight: 600, letterSpacing: '0.05em' }}>DATE</th>
                    <th style={{ padding: '1rem 1.2rem', color: 'var(--color-bronze)', fontWeight: 600, letterSpacing: '0.05em' }}>STATUS</th>
                    <th style={{ padding: '1rem 1.2rem', color: 'var(--color-bronze)', fontWeight: 600, letterSpacing: '0.05em' }}>EMAIL STATUS</th>
                    <th style={{ padding: '1rem 1.2rem', color: 'var(--color-bronze)', fontWeight: 600, letterSpacing: '0.05em', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersList
                    .filter((order) => {
                      if (!orderSearchQuery.trim()) return true;
                      const q = orderSearchQuery.toLowerCase();
                      return (
                        order.orderReference?.toLowerCase().includes(q) ||
                        order.email?.toLowerCase().includes(q) ||
                        order.productName?.toLowerCase().includes(q) ||
                        order.pickupLocationName?.toLowerCase().includes(q)
                      );
                    })
                    .map((order) => (
                      <tr key={order.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '1rem 1.2rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-bronze)' }}>
                          #{order.orderReference}
                        </td>
                        <td style={{ padding: '1rem 1.2rem', color: '#f5f5f5' }}>
                          {order.email}
                        </td>
                        <td style={{ padding: '1rem 1.2rem', color: '#ddd' }}>
                          {order.productName}
                        </td>
                        <td style={{ padding: '1rem 1.2rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
                          ₦{Number(order.price).toLocaleString()}
                        </td>
                        <td style={{ padding: '1rem 1.2rem', color: 'var(--color-muted)' }}>
                          <div style={{ fontWeight: 600, color: '#eee' }}>{order.pickupLocationName || 'N/A'}</div>
                          {order.pickupLocationAddress && (
                            <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '2px', maxWidth: '200px' }}>
                              {order.pickupLocationAddress}
                            </div>
                          )}
                          {order.pickupLocationOpeningHours && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-bronze)', marginTop: '2px' }}>
                              🕒 {order.pickupLocationOpeningHours}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.2rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '1rem 1.2rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            backgroundColor: order.status === 'paid' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(250, 204, 21, 0.15)',
                            color: order.status === 'paid' ? '#4ade80' : '#facc15',
                            border: order.status === 'paid' ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(250, 204, 21, 0.3)',
                          }}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.2rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
                            {order.emailStatus === 'sent' ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                backgroundColor: 'rgba(74, 222, 128, 0.15)',
                                color: '#4ade80',
                                border: '1px solid rgba(74, 222, 128, 0.3)',
                                width: 'fit-content',
                              }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Sent
                              </span>
                            ) : order.emailStatus === 'failed' ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                width: 'fit-content',
                              }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="8" x2="12" y2="12"></line>
                                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                Failed
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                backgroundColor: 'rgba(156, 163, 175, 0.15)',
                                color: '#9ca3af',
                                border: '1px solid rgba(156, 163, 175, 0.3)',
                                width: 'fit-content',
                              }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                Pending
                              </span>
                            )}
                            {order.emailError && order.emailStatus === 'failed' && (
                              <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '2px', maxWidth: '200px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                {order.emailError}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.2rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleResendEmail(order.id)}
                            disabled={resendingOrderId === order.id}
                            style={{
                              padding: '0.4rem 0.8rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: 'transparent',
                              color: 'var(--color-bronze)',
                              border: '1px solid var(--color-bronze)',
                              borderRadius: '4px',
                              cursor: resendingOrderId === order.id ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.2s',
                            }}
                          >
                            {resendingOrderId === order.id ? 'Sending...' : 'Resend Email'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'tickets' ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 0 4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--color-white)', margin: '0 0 0.25rem 0', fontFamily: 'var(--font-serif)' }}>
                Event Ticket Bookings
              </h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', margin: 0 }}>
                Live records of event attendees, ticket references, payments, and receipt delivery.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchTickets}
              disabled={isLoadingTickets}
              style={{
                padding: '0.55rem 1.1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: isLoadingTickets ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              {isLoadingTickets ? 'Refreshing...' : 'Refresh Bookings'}
            </button>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Search by Ticket Ref, Email, or Event Title..."
              value={ticketSearchQuery}
              onChange={(e) => setTicketSearchQuery(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '450px',
                padding: '0.65rem 1rem',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {isLoadingTickets ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
              Loading event tickets...
            </div>
          ) : ticketsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)', border: '1px dashed var(--color-border)', borderRadius: '8px' }}>
              No event ticket bookings found yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-bronze)' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Ticket Ref</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Attendee Email</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Event Title</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Date &amp; Venue</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Tickets &bull; Total</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Payment</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Receipt Email</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsList
                    .filter((t) => {
                      if (!ticketSearchQuery) return true;
                      const q = ticketSearchQuery.toLowerCase();
                      return (
                        (t.ticketReference && t.ticketReference.toLowerCase().includes(q)) ||
                        (t.email && t.email.toLowerCase().includes(q)) ||
                        (t.eventTitle && t.eventTitle.toLowerCase().includes(q)) ||
                        (t.eventLocation && t.eventLocation.toLowerCase().includes(q))
                      );
                    })
                    .map((ticket) => (
                      <tr key={ticket.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-bronze)' }}>
                          #{ticket.ticketReference}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#fff' }}>
                          {ticket.email}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--color-ivory)', fontWeight: 600 }}>
                          {ticket.eventTitle}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--color-muted)' }}>
                          <div>{new Date(ticket.eventDate).toLocaleDateString()}</div>
                          <small style={{ color: 'var(--color-muted)' }}>{ticket.eventLocation}</small>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#fff', fontWeight: 600 }}>
                          {ticket.quantity} Ticket{ticket.quantity > 1 ? 's' : ''} &bull; ₦{Number(ticket.totalPrice || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            backgroundColor: ticket.status === 'paid' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                            color: ticket.status === 'paid' ? '#4ade80' : '#eab308',
                            border: `1px solid ${ticket.status === 'paid' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                          }}>
                            {ticket.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            backgroundColor: ticket.emailStatus === 'sent' ? 'rgba(74, 222, 128, 0.15)' : ticket.emailStatus === 'failed' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                            color: ticket.emailStatus === 'sent' ? '#4ade80' : ticket.emailStatus === 'failed' ? '#ef4444' : '#9ca3af',
                            border: `1px solid ${ticket.emailStatus === 'sent' ? 'rgba(74, 222, 128, 0.3)' : ticket.emailStatus === 'failed' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(156, 163, 175, 0.3)'}`,
                          }}>
                            {ticket.emailStatus}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleResendTicketEmail(ticket.id)}
                            disabled={resendingTicketId === ticket.id}
                            style={{
                              padding: '0.4rem 0.8rem',
                              fontSize: '0.75rem',
                              backgroundColor: 'transparent',
                              color: 'var(--color-bronze)',
                              border: '1px solid var(--color-bronze)',
                              borderRadius: '4px',
                              cursor: resendingTicketId === ticket.id ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {resendingTicketId === ticket.id ? 'Sending...' : 'Resend Email'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'products' ? (
        <>
          {/* Products Selector */}
          <div className="form-group" style={{ marginBottom: '3rem', maxWidth: '500px' }}>
            <label htmlFor="product-select" style={{ fontSize: '0.8rem', color: 'var(--color-bronze)' }}>
              Select Product Action
            </label>
            <select
              id="product-select"
              className="form-select"
              value={selectedProductId}
              onChange={handleSelectProduct}
              style={{ marginTop: '0.5rem', border: '1px solid var(--color-bronze)' }}
            >
              <option value="">-- Choose an action --</option>
              <option value="new">+ Create New Product</option>
              <optgroup label="Edit Existing Products">
                {productsList.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} (₦{Number(prod.price).toLocaleString()} • {prod.stock} in stock)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="admin-grid" style={{ opacity: selectedProductId ? 1 : 0.4, transition: 'opacity 0.3s' }}>
            {/* Left Column: Product Form */}
            <div>
              <h2 className="subtitle-tag" style={{ marginBottom: '2rem' }}>
                {selectedProductId === 'new' ? 'Create Product Details' : 'Edit Product Details'}
              </h2>
              <form onSubmit={handleProductSubmit} className="editor-form">
                <div className="form-group">
                  <label htmlFor="productName">Product Name</label>
                  <input
                    id="productName"
                    type="text"
                    className="form-input"
                    value={productForm.name}
                    onChange={(e) => updateProductField('name', e.target.value)}
                    required
                    disabled={!selectedProductId || isSubmitting}
                    placeholder="e.g. SLEEK Issue 01 - Physical Copy"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="productCategory">Category</label>
                  <select
                    id="productCategory"
                    className="form-select"
                    value={productForm.category}
                    onChange={(e) => updateProductField('category', e.target.value)}
                    disabled={!selectedProductId || isSubmitting}
                  >
                    <option value="Accessories">Accessories</option>
                    <option value="Apparel">Apparel</option>
                    <option value="Beauty">Beauty</option>
                    <option value="Home">Home</option>
                    <option value="Edition">Edition</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="productPrice">Price (NGN)</label>
                    <input
                      id="productPrice"
                      type="number"
                      min="0"
                      className="form-input"
                      value={productForm.price}
                      onChange={(e) => updateProductField('price', e.target.value)}
                      required
                      disabled={!selectedProductId || isSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="productStock">Stock Quantity</label>
                    <input
                      id="productStock"
                      type="number"
                      min="0"
                      className="form-input"
                      value={productForm.stock}
                      onChange={(e) => updateProductField('stock', e.target.value)}
                      required
                      disabled={!selectedProductId || isSubmitting}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="productDescription">Description</label>
                  <textarea
                    id="productDescription"
                    className="form-textarea"
                    rows="4"
                    value={productForm.description}
                    onChange={(e) => updateProductField('description', e.target.value)}
                    required
                    disabled={!selectedProductId || isSubmitting}
                    placeholder="Product details, material, and edition highlights..."
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    id="productActive"
                    type="checkbox"
                    checked={productForm.active}
                    onChange={(e) => updateProductField('active', e.target.checked)}
                    disabled={!selectedProductId || isSubmitting}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <label htmlFor="productActive" style={{ margin: 0, cursor: 'pointer', color: 'var(--color-ivory)' }}>
                    Product is live and visible in the shop
                  </label>
                </div>

                {/* Product Photo Upload Section */}
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label>Product Photo (4:3 Aspect Ratio)</label>
                  <label
                    className="upload-zone"
                    style={{
                      cursor: selectedProductId && !isSubmitting ? 'pointer' : 'not-allowed',
                      opacity: selectedProductId ? 1 : 0.6,
                    }}
                  >
                    <input
                      id="upload-product-photo-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUploadSelect}
                      style={{ display: 'none' }}
                      disabled={!selectedProductId || isUploading || isSubmitting}
                    />
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-bronze)"
                      strokeWidth="1.5"
                      style={{ marginBottom: '0.5rem' }}
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    <span className="upload-text">
                      {isUploading
                        ? 'Uploading to Cloudinary...'
                        : productForm.image && productForm.image !== defaultProductImage
                        ? 'Click to change product photo'
                        : 'Click to upload product photo (4:3 Aspect Ratio)'}
                    </span>
                  </label>

                  {productForm.image && productForm.image !== defaultProductImage && (
                    <div className="form-group" style={{ marginTop: '1.5rem' }}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Photo Preview (4:3)</span>
                        <button
                          type="button"
                          onClick={() => document.getElementById('upload-product-photo-input').click()}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-bronze)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: 0,
                          }}
                        >
                          Change Photo
                        </button>
                      </label>
                      <div className="upload-preview" style={{ aspectRatio: '4/3', maxWidth: '320px' }}>
                        <img src={productForm.image} alt="Product preview" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="admin-button-group" style={{ marginTop: '2rem' }}>
                  <button
                    type="submit"
                    className="publish-btn"
                    disabled={!selectedProductId || isSubmitting || isUploading}
                  >
                    {isSubmitting ? 'SAVING...' : productForm.id ? 'UPDATE PRODUCT' : 'CREATE PRODUCT'}
                  </button>
                  {productForm.id && (
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => handleDeleteProduct(productForm.id)}
                      disabled={isSubmitting}
                    >
                      DELETE
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right Column: Products List */}
            <div>
              <h2 className="subtitle-tag" style={{ marginBottom: '2rem' }}>
                Manage Products ({productsList.length})
              </h2>

              {productsList.length === 0 ? (
                <p style={{ color: 'var(--color-muted)' }}>No products in shop yet. Create one to get started.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {productsList.map((product) => (
                    <div
                      key={product.id}
                      className="admin-article-item"
                      onClick={() => handleEditProduct(product)}
                      style={{
                        padding: '1rem',
                        borderLeft: selectedProductId === product.id ? '3px solid var(--color-bronze)' : '3px solid transparent',
                        cursor: 'pointer',
                        backgroundColor: selectedProductId === product.id ? 'rgba(186, 156, 135, 0.08)' : 'var(--color-black-card)',
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '50px',
                          height: '70px',
                          borderRadius: '4px',
                          backgroundImage: `url('${product.image || defaultProductImage}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          flexShrink: 0,
                          border: '1px solid var(--color-border)',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {product.name}
                          </p>
                          <span style={{ fontSize: '0.75rem', color: product.active ? '#4ade80' : 'var(--color-muted)', fontWeight: 600 }}>
                            {product.active ? '● Live' : '○ Draft'}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                          {product.category}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-bronze)' }}>
                          ₦{Number(product.price).toLocaleString()} • {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="admin-move-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProduct(product);
                          }}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product.id);
                          }}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : activeTab === 'events' ? (
        <>
          {/* Events Selector */}
          <div className="form-group" style={{ marginBottom: '3rem', maxWidth: '500px' }}>
            <label htmlFor="event-select" style={{ fontSize: '0.8rem', color: 'var(--color-bronze)' }}>
              Select Event Action
            </label>
            <select
              id="event-select"
              className="form-select"
              value={selectedEventId}
              onChange={handleSelectEvent}
              style={{ marginTop: '0.5rem', border: '1px solid var(--color-bronze)' }}
            >
              <option value="">-- Choose an action --</option>
              <option value="new">+ Create New Event</option>
              <optgroup label="Edit Existing Events">
                {eventsList.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({new Date(ev.date).toLocaleDateString()}) • {ev.ticketPrice && ev.ticketPrice > 0 ? `₦${Number(ev.ticketPrice).toLocaleString()}` : 'Free'}{ev.hasTickets ? ' (Online Tickets)' : ' (Door/RSVP)'}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="admin-grid" style={{ opacity: selectedEventId ? 1 : 0.4, transition: 'opacity 0.3s' }}>
            {/* Left Column: Event Form */}
            <div>
              <h2 className="subtitle-tag" style={{ marginBottom: '2rem' }}>
                {selectedEventId === 'new' ? 'Create Event Details' : 'Edit Event Details'}
              </h2>
              <form onSubmit={handleEventSubmit} className="editor-form">
                <div className="form-group">
                  <label htmlFor="eventTitle">Event Title</label>
                  <input
                    id="eventTitle"
                    type="text"
                    className="form-input"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    required
                    disabled={!selectedEventId || isSubmitting}
                    placeholder="e.g. SLEEK Nightwave: Launch Party"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="eventDate">Date &amp; Time</label>
                  <input
                    id="eventDate"
                    type="datetime-local"
                    className="form-input"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                    disabled={!selectedEventId || isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="eventLocation">Venue / Location Name</label>
                  <input
                    id="eventLocation"
                    type="text"
                    className="form-input"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    required
                    disabled={!selectedEventId || isSubmitting}
                    placeholder="e.g. The Glasshouse Lounge"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="eventAddress">Full Address (For Directions)</label>
                  <input
                    id="eventAddress"
                    type="text"
                    className="form-input"
                    value={eventAddress}
                    onChange={(e) => setEventAddress(e.target.value)}
                    required
                    disabled={!selectedEventId || isSubmitting}
                    placeholder="e.g. 15 Admiralty Way, Lekki Phase 1, Lagos"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="eventLat">Latitude (Optional GPS)</label>
                    <input
                      id="eventLat"
                      type="number"
                      step="0.00001"
                      className="form-input"
                      value={eventLat}
                      onChange={(e) => setEventLat(e.target.value)}
                      placeholder="e.g. 6.4474"
                      disabled={!selectedEventId || isSubmitting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="eventLng">Longitude (Optional GPS)</label>
                    <input
                      id="eventLng"
                      type="number"
                      step="0.00001"
                      className="form-input"
                      value={eventLng}
                      onChange={(e) => setEventLng(e.target.value)}
                      placeholder="e.g. 3.4723"
                      disabled={!selectedEventId || isSubmitting}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="eventHasTickets" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                      Online Ticket Sales
                    </label>
                    <select
                      id="eventHasTickets"
                      className="form-select"
                      value={eventHasTickets ? 'yes' : 'no'}
                      onChange={(e) => setEventHasTickets(e.target.value === 'yes')}
                      disabled={!selectedEventId || isSubmitting}
                    >
                      <option value="no">No Tickets Online (RSVP / Pay at Door / Free)</option>
                      <option value="yes">Yes — Sell Admission Tickets Online</option>
                    </select>
                    <small style={{ color: 'var(--color-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      Controls whether the &quot;Get Tickets&quot; checkout button is active.
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="eventTicketPrice" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                      Admission / Ticket Price (₦ Naira)
                    </label>
                    <input
                      id="eventTicketPrice"
                      type="number"
                      min="0"
                      step="500"
                      className="form-input"
                      value={eventTicketPrice}
                      onChange={(e) => setEventTicketPrice(e.target.value)}
                      disabled={!selectedEventId || isSubmitting}
                      placeholder="e.g. 5000 (0 for Free Entry)"
                    />
                    <small style={{ color: 'var(--color-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      Price is always visible to visitors on cards &amp; modal (set 0 for Free Entry).
                    </small>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="eventDescription">Description &amp; Event Info</label>
                  <textarea
                    id="eventDescription"
                    className="form-textarea"
                    rows="4"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    required
                    disabled={!selectedEventId || isSubmitting}
                    placeholder="Party lineup, dress code, special guests, and schedule..."
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    id="eventActive"
                    type="checkbox"
                    checked={eventActive}
                    onChange={(e) => setEventActive(e.target.checked)}
                    disabled={!selectedEventId || isSubmitting}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <label htmlFor="eventActive" style={{ margin: 0, cursor: 'pointer', color: 'var(--color-ivory)' }}>
                    Event is published and visible on the website
                  </label>
                </div>

                {/* Event Photo Upload */}
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label>Event Photo (4:3 Aspect Ratio - Same as Articles)</label>
                  <label
                    className="upload-zone"
                    style={{
                      cursor: selectedEventId && !isSubmitting ? 'pointer' : 'not-allowed',
                      opacity: selectedEventId ? 1 : 0.6,
                    }}
                  >
                    <input
                      id="upload-event-photo-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUploadSelect}
                      style={{ display: 'none' }}
                      disabled={!selectedEventId || isUploading || isSubmitting}
                    />
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-bronze)"
                      strokeWidth="1.5"
                      style={{ marginBottom: '0.5rem' }}
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    <span className="upload-text">
                      {isUploading
                        ? 'Uploading to Cloudinary...'
                        : eventImage
                        ? 'Click to change event photo'
                        : 'Click to upload event photo (4:3 Aspect Ratio)'}
                    </span>
                  </label>

                  {eventImage && (
                    <div className="form-group" style={{ marginTop: '1.5rem' }}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Photo Preview (4:3)</span>
                        <button
                          type="button"
                          onClick={() => document.getElementById('upload-event-photo-input').click()}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-bronze)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: 0,
                          }}
                        >
                          Change Photo
                        </button>
                      </label>
                      <div className="upload-preview" style={{ aspectRatio: '4/3', maxWidth: '320px' }}>
                        <img src={eventImage} alt="Event preview" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="admin-button-group" style={{ marginTop: '2rem' }}>
                  <button
                    type="submit"
                    className="publish-btn"
                    disabled={!selectedEventId || isSubmitting || isUploading}
                  >
                    {isSubmitting ? 'SAVING...' : selectedEventId && selectedEventId !== 'new' ? 'UPDATE EVENT' : 'CREATE EVENT'}
                  </button>
                  {selectedEventId && selectedEventId !== 'new' && (
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => handleDeleteEvent(selectedEventId)}
                      disabled={isSubmitting}
                    >
                      DELETE
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right Column: Events List */}
            <div>
              <h2 className="subtitle-tag" style={{ marginBottom: '2rem' }}>
                Manage Events ({eventsList.length})
              </h2>

              {isLoadingEvents && eventsList.length === 0 ? (
                <p style={{ color: 'var(--color-muted)' }}>Loading events...</p>
              ) : eventsList.length === 0 ? (
                <p style={{ color: 'var(--color-muted)' }}>No events created yet. Click "+ Create New Event" to schedule your first gathering.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {eventsList.map((ev) => {
                    const isPast = new Date(ev.date) < new Date();
                    return (
                      <div
                        key={ev.id}
                        className="admin-article-item"
                        onClick={() => {
                          setSelectedEventId(ev.id);
                          setFeedback({ message: '', type: '' });
                          setEventTitle(ev.title);
                          try {
                            const d = new Date(ev.date);
                            const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                            setEventDate(isoLocal);
                          } catch {
                            setEventDate('');
                          }
                          setEventLocation(ev.location);
                          setEventAddress(ev.address);
                          setEventLat(ev.latitude != null ? ev.latitude.toString() : '');
                          setEventLng(ev.longitude != null ? ev.longitude.toString() : '');
                          setEventDescription(ev.description);
                          setEventImage(ev.image || '');
                          setEventActive(ev.active);
                        }}
                        style={{
                          padding: '1rem',
                          borderLeft: selectedEventId === ev.id ? '3px solid var(--color-bronze)' : '3px solid transparent',
                          cursor: 'pointer',
                          backgroundColor: selectedEventId === ev.id ? 'rgba(186, 156, 135, 0.08)' : 'var(--color-black-card)',
                          display: 'flex',
                          gap: '1rem',
                          alignItems: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: '64px',
                            height: '48px',
                            borderRadius: '4px',
                            backgroundImage: `url('${ev.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop'}')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            flexShrink: 0,
                            border: '1px solid var(--color-border)',
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ev.title}
                            </p>
                            <span style={{ fontSize: '0.75rem', color: ev.active ? '#4ade80' : 'var(--color-muted)', fontWeight: 600 }}>
                              {ev.active ? (isPast ? '● Concluded' : '● Upcoming') : '○ Draft'}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: 'var(--color-bronze)' }}>
                            🕒 {new Date(ev.date).toLocaleDateString()} • {ev.location}
                            {ev.latitude != null && ev.longitude != null && (
                              <span style={{ marginLeft: '0.5rem', color: 'var(--color-muted)', fontSize: '0.75rem' }}>
                                (GPS: {ev.latitude.toFixed(4)}, {ev.longitude.toFixed(4)})
                              </span>
                            )}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                            ★ {ev.averageRating ? `${ev.averageRating} / 5 (${ev.ratingsCount || 0} ratings)` : 'No ratings yet'} • {ev.commentsCount || 0} comments
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <button
                            type="button"
                            className="admin-move-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEventId(ev.id);
                              setEventTitle(ev.title);
                              try {
                                const d = new Date(ev.date);
                                const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                setEventDate(isoLocal);
                              } catch {
                                setEventDate('');
                              }
                              setEventLocation(ev.location);
                              setEventAddress(ev.address);
                              setEventLat(ev.latitude != null ? ev.latitude.toString() : '');
                              setEventLng(ev.longitude != null ? ev.longitude.toString() : '');
                              setEventDescription(ev.description);
                              setEventImage(ev.image || '');
                              setEventActive(ev.active);
                            }}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(ev.id);
                            }}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="admin-grid">
          {/* Left Column: Cover Fields */}
          <div>
            <h2 className="subtitle-tag" style={{ marginBottom: '2rem' }}>
              Cover Text Parameters
            </h2>
            <form onSubmit={handleSaveCoverSettings} className="editor-form">
              <div className="form-group">
                <label htmlFor="coverTitleInput">Cover Title (e.g. SLEEK)</label>
                <input
                  id="coverTitleInput"
                  type="text"
                  className="form-input"
                  value={coverTitle}
                  onChange={(e) => setCoverTitle(e.target.value)}
                  placeholder="Enter Cover Title..."
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="coverIssueInput">Issue Number (e.g. ISH. 01)</label>
                <input
                  id="coverIssueInput"
                  type="text"
                  className="form-input"
                  value={coverIssue}
                  onChange={(e) => setCoverIssue(e.target.value)}
                  placeholder="Enter Issue Number..."
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="coverLabelInput">Magazine Label (e.g. MAGAZINE)</label>
                <input
                  id="coverLabelInput"
                  type="text"
                  className="form-input"
                  value={coverLabel}
                  onChange={(e) => setCoverLabel(e.target.value)}
                  placeholder="Enter Magazine Label..."
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="coverTaglineInput">Cover Tagline (e.g. A New WAVE)</label>
                <input
                  id="coverTaglineInput"
                  type="text"
                  className="form-input"
                  value={coverTagline}
                  onChange={(e) => setCoverTagline(e.target.value)}
                  placeholder="Enter Cover Tagline..."
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="coverUrlInput">Website Domain URL (e.g. www.sleekmagazine.com)</label>
                <input
                  id="coverUrlInput"
                  type="text"
                  className="form-input"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="Enter website domain..."
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="coverSocialInput">Instagram/Social Handle (e.g. @socialhandle)</label>
                <input
                  id="coverSocialInput"
                  type="text"
                  className="form-input"
                  value={coverSocial}
                  onChange={(e) => setCoverSocial(e.target.value)}
                  placeholder="Enter social handle..."
                  disabled={isSubmitting}
                />
              </div>

              {feedback.message && (
                <div className={`admin-feedback ${feedback.type}`}>{feedback.message}</div>
              )}

              <div className="admin-button-group">
                <button
                  type="submit"
                  className="publish-btn"
                  style={{ flex: 1 }}
                  disabled={isSubmitting || isUploading}
                >
                  {isSubmitting ? 'SAVING...' : 'SAVE COVER SETTINGS'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Cover Photo */}
          <div>
            <h2 className="subtitle-tag" style={{ marginBottom: '2rem' }}>
              Cover Background Photo
            </h2>
            <div className="form-group">
              <label>Upload Background Image (16:10 Aspect Ratio)</label>
              <label
                className="upload-zone"
                style={{
                  cursor: 'pointer',
                }}
              >
                <input
                  id="upload-cover-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUploadSelect}
                  style={{ display: 'none' }}
                  disabled={isUploading || isSubmitting}
                />
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-bronze)"
                  strokeWidth="1.5"
                  style={{ marginBottom: '0.5rem' }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <span className="upload-text">
                  {isUploading ? 'Uploading to Cloudinary...' : coverImage ? 'Click to change photo' : 'Click to upload Cover photo'}
                </span>
              </label>

              {coverImage && (
                <div className="form-group" style={{ marginTop: '2rem' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Photo Preview</span>
                    <button
                      type="button"
                      onClick={() => document.getElementById('upload-cover-input').click()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-bronze)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0
                      }}
                    >
                      Change Photo
                    </button>
                  </label>
                  <div className="upload-preview" style={{ aspectRatio: '16/10' }}>
                    <img src={coverImage} alt="Uploaded cover preview" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client-side Crop Modal overlay */}
      {cropImageSrc && (
        <div className="crop-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: '2rem'
        }}>
          <div className="crop-modal-content" style={{
            backgroundColor: 'var(--color-black-card)',
            border: '1px solid var(--color-border)',
            padding: 'clamp(1.5rem, 4vw, 3rem)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <h2 className="login-title" style={{ fontSize: '1.5rem', textAlign: 'center', color: 'var(--color-bronze)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em' }}>
              CROP PHOTO
            </h2>

            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
              Drag the photo inside the bronze frame to position. Use the zoom slider below to resize.
            </p>

            {/* Viewport Box */}
            <div
              className="crop-viewport"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              style={{
                width: '100%',
                maxWidth: '400px',
                aspectRatio: activeTab === 'cover' ? '16/10' : '4/3',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid var(--color-bronze)',
                backgroundColor: '#050505',
                margin: '0 auto',
                cursor: 'move'
              }}
            >
              {(() => {
                const targetAspect = activeTab === 'cover' ? 16 / 10 : 4 / 3;
                const aspect = imageAspect || targetAspect;
                const isWider = aspect >= targetAspect;
                return (
                  <img
                    id="crop-target-img"
                    src={cropImageSrc}
                    alt="To Crop"
                    onLoad={(e) => {
                      const nw = e.currentTarget.naturalWidth || 1200;
                      const nh = e.currentTarget.naturalHeight || 900;
                      setImageAspect(nw / nh);
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: isWider ? `${(aspect / targetAspect) * 100}%` : '100%',
                      height: isWider ? '100%' : `${(targetAspect / aspect) * 100}%`,
                      maxWidth: 'none',
                      maxHeight: 'none',
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                      transformOrigin: 'center center',
                      userSelect: 'none',
                      pointerEvents: 'none',
                      display: 'block'
                    }}
                  />
                );
              })()}
              {/* Guidelines */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                border: '1px dashed rgba(186, 156, 135, 0.25)',
                pointerEvents: 'none'
              }}></div>
            </div>

            {/* Zoom controller */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', color: 'var(--color-muted)' }}>
                <span>ZOOM</span>
                <span style={{ color: 'var(--color-bronze)' }}>{Math.round(zoom * 100)}%</span>
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-bronze)', marginTop: '0.5rem', cursor: 'pointer' }}
              />
            </div>

            {/* Crop Controls */}
            <div className="admin-button-group" style={{ gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="publish-btn"
                onClick={handleConfirmCrop}
                style={{ flex: 1 }}
              >
                CROP &amp; UPLOAD
              </button>
              <button
                type="button"
                className="delete-btn"
                onClick={handleCancelCrop}
                style={{ flex: 1 }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

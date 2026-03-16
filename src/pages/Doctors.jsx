import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, PhoneCall, Star, Video } from 'lucide-react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import supabase from '../lib/supabase.js'

const DEFAULT_LOCATION = {
  lat: 28.6139,
  lng: 77.209,
}

const roseIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23e8607a"/><stop offset="100%" stop-color="%239b5e8a"/></linearGradient></defs><path d="M16 0C8 0 2 6 2 14c0 9.5 11 21 13.3 23.4.4.4 1 .4 1.4 0C19 35 30 23.5 30 14 30 6 24 0 16 0z" fill="url(%23g)"/><circle cx="16" cy="14" r="5" fill="%23fff"/></svg>',
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -46],
})

const doctorIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48"><path d="M16 0C8 0 2 6 2 14c0 9.5 11 21 13.3 23.4.4.4 1 .4 1.4 0C19 35 30 23.5 30 14 30 6 24 0 16 0z" fill="%234f8dd6"/><circle cx="16" cy="14" r="5" fill="%23fff"/></svg>',
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -46],
})

const pharmacyIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48"><path d="M16 0C8 0 2 6 2 14c0 9.5 11 21 13.3 23.4.4.4 1 .4 1.4 0C19 35 30 23.5 30 14 30 6 24 0 16 0z" fill="%2367b86a"/><circle cx="16" cy="14" r="5" fill="%23fff"/></svg>',
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -46],
})

function haversineKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)

  const c =
    sinDLat * sinDLat + sinDLng * sinDLng * Math.cos(lat1) * Math.cos(lat2)

  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c))
}

function buildMockPlaces(userLocation) {
  const { lat, lng } = userLocation
  const mockPlaces = [
    {
      id: 1,
      name: 'Dr. Priya Sharma',
      specialty: 'Gynecologist',
      type: 'doctor',
      lat: lat + 0.008,
      lon: lng + 0.006,
      rating: 4.8,
      available: 'Today 2:00 PM',
      address: 'City Medical Center',
      phone: '+91 98765 43210',
    },
    {
      id: 2,
      name: 'Womens Health Clinic',
      specialty: 'Gynecologist',
      type: 'doctor',
      lat: lat - 0.005,
      lon: lng + 0.01,
      rating: 4.6,
      available: 'Today 4:00 PM',
      address: 'Main Road Clinic',
      phone: '+91 98765 43211',
    },
    {
      id: 3,
      name: 'Dr. Anita Mehta',
      specialty: 'PCOS Specialist',
      type: 'doctor',
      lat: lat + 0.012,
      lon: lng - 0.008,
      rating: 4.9,
      available: 'Tomorrow 10:00 AM',
      address: 'Health District',
      phone: '+91 98765 43212',
    },
    {
      id: 4,
      name: 'Fertility and Wellness Center',
      specialty: 'Gynecologist',
      type: 'doctor',
      lat: lat - 0.009,
      lon: lng - 0.005,
      rating: 4.7,
      available: 'Today 5:00 PM',
      address: 'West Side Plaza',
      phone: '+91 98765 43213',
    },
    {
      id: 5,
      name: 'Dr. Sunita Rao',
      specialty: 'Endocrinologist',
      type: 'doctor',
      lat: lat + 0.006,
      lon: lng + 0.012,
      rating: 4.5,
      available: 'Tomorrow 2:00 PM',
      address: 'Medical Complex',
      phone: '+91 98765 43214',
    },
    {
      id: 6,
      name: 'Apollo Pharmacy',
      specialty: 'Pharmacy',
      type: 'pharmacy',
      lat: lat + 0.003,
      lon: lng + 0.003,
      rating: 4.5,
      address: 'Near Bus Stop',
      phone: '+91 98765 43215',
    },
    {
      id: 7,
      name: 'MedPlus Pharmacy',
      specialty: 'Pharmacy',
      type: 'pharmacy',
      lat: lat - 0.007,
      lon: lng + 0.007,
      rating: 4.3,
      address: 'Market Area',
      phone: '+91 98765 43216',
    },
    {
      id: 8,
      name: 'Wellness Forever',
      specialty: 'Pharmacy',
      type: 'pharmacy',
      lat: lat + 0.006,
      lon: lng - 0.004,
      rating: 4.4,
      address: 'Shopping Complex',
      phone: '+91 98765 43217',
    },
  ]

  return mockPlaces
    .map((place) => {
      const coords = { lat: place.lat, lng: place.lon }
      return {
        id: `mock-${place.id}`,
        name: place.name,
        specialty: place.specialty,
        address: place.address,
        phone: place.phone,
        coords,
        distanceKm: haversineKm(userLocation, coords),
        type: place.type,
        rating: place.rating,
        available: place.available ?? null,
      }
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

const VIDEO_DOCTORS = [
  {
    id: 'priya-sharma',
    name: 'Dr. Priya Sharma',
    specialty: 'Gynecologist',
    availability: 'Available now',
    rating: 4.9,
  },
  {
    id: 'anita-mehta',
    name: 'Dr. Anita Mehta',
    specialty: 'Endocrinologist',
    availability: 'Next available 4:30 PM',
    rating: 4.8,
  },
  {
    id: 'sunita-rao',
    name: 'Dr. Sunita Rao',
    specialty: 'General Physician',
    availability: 'Available now',
    rating: 4.7,
  },
  {
    id: 'kavita-singh',
    name: 'Dr. Kavita Singh',
    specialty: 'PCOS Specialist',
    availability: 'Next available 6:00 PM',
    rating: 4.9,
  },
]

const TIME_SLOTS = ['9AM', '10AM', '11AM', '2PM', '3PM', '4PM']

export default function Doctors() {
  const [userLocation, setUserLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [places, setPlaces] = useState([])
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [placesError, setPlacesError] = useState('')
  const [activeBooking, setActiveBooking] = useState(null)
  const [appointmentDate, setAppointmentDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [patientName, setPatientName] = useState('')
  const [reason, setReason] = useState('')
  const [bookingSaving, setBookingSaving] = useState(false)
  const [appointments, setAppointments] = useState([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [appointmentsError, setAppointmentsError] = useState('')
  const [videoDoctor, setVideoDoctor] = useState(null)
  const [videoStream, setVideoStream] = useState(null)
  const videoRef = useRef(null)

  useEffect(() => {
    let active = true

    async function loadProfileAndAppointments() {
      setAppointmentsLoading(true)
      setAppointmentsError('')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (!active) {
        return
      }

      if (userError || !user) {
        setAppointments([])
        setAppointmentsLoading(false)
        return
      }

      const [profileResult, apptResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase
          .from('appointments')
          .select('*')
          .eq('profile_id', user.id)
          .order('appointment_date', { ascending: true }),
      ])

      if (!active) {
        return
      }

      if (!profileResult.error && typeof profileResult.data?.full_name === 'string') {
        setPatientName(profileResult.data.full_name)
      }

      if (apptResult.error) {
        setAppointmentsError(
          apptResult.error.message || 'Could not load your appointments yet.',
        )
        setAppointments([])
      } else {
        setAppointments(apptResult.data ?? [])
      }

      setAppointmentsLoading(false)
    }

    loadProfileAndAppointments()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!userLocation) {
      return
    }

    setLoadingPlaces(true)
    setPlacesError('')
    setPlaces(buildMockPlaces(userLocation))
    setLoadingPlaces(false)
  }, [userLocation])

  const mapCenter = userLocation ?? DEFAULT_LOCATION

  const doctorResults = useMemo(
    () => places.filter((place) => place.type === 'doctor'),
    [places],
  )
  const allResults = useMemo(() => places, [places])

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocationError('Location is not available on this device.')
      return
    }

    setLocating(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })
        setLocating(false)
      },
      (error) => {
        setLocationError(
          error.message || 'We could not get your location. Please try again.',
        )
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  useEffect(() => {
    handleLocate()
  }, [])

  const handleOpenBooking = (place) => {
    setActiveBooking(place)
    setAppointmentDate('')
    setTimeSlot('')
    setReason('')
  }

  const handleConfirmBooking = async () => {
    if (!activeBooking || !appointmentDate || !timeSlot) {
      return
    }

    setBookingSaving(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setBookingSaving(false)
      return
    }

    const { error } = await supabase.from('appointments').insert({
      profile_id: user.id,
      doctor_name: activeBooking.name,
      doctor_address: activeBooking.address,
      appointment_date: appointmentDate,
      time_slot: timeSlot,
      reason,
      status: 'confirmed',
    })

    if (!error) {
      setActiveBooking(null)
      setReason('')
      setTimeSlot('')
      setAppointmentDate('')

      const { data: refreshed, error: refreshError } = await supabase
        .from('appointments')
        .select('*')
        .eq('profile_id', user.id)
        .order('appointment_date', { ascending: true })

      if (!refreshError && refreshed) {
        setAppointments(refreshed)
      }
    }

    setBookingSaving(false)
  }

  useEffect(() => {
    if (!videoDoctor || !videoRef.current) {
      return
    }

    let active = true

    async function startVideo() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        if (videoRef.current) {
          // eslint-disable-next-line no-param-reassign
          videoRef.current.srcObject = stream
        }
        setVideoStream(stream)
      } catch {
        // Ignore video errors for now
      }
    }

    startVideo()

    return () => {
      active = false
    }
  }, [videoDoctor])

  const handleEndCall = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop())
    }
    setVideoStream(null)
    setVideoDoctor(null)
  }

  return (
    <div className="doctors-page page-stack">
      <header className="section-title">
        <p className="eyebrow">Care team</p>
        <h1>Find a doctor</h1>
      </header>

      <section className="card doctors-location-card">
        <div className="card-head doctors-location-head">
          <div>
            <p className="card-label">Your location</p>
            <h3>{userLocation ? 'Doctors near you' : 'Finding doctors near you'}</h3>
          </div>
          <span className="doctors-location-icon" aria-hidden="true">
            <MapPin size={20} />
          </span>
        </div>
        <p className="doctors-location-copy">
          Turn on location so Veluna can suggest gynecologists, clinics, and nearby pharmacies in your
          area. Your coordinates are only used to personalize this nearby care map.
        </p>
        {locationError ? <p className="status-text status-text-error">{locationError}</p> : null}
        <button
          type="button"
          className="pill-button doctors-locate-button"
          onClick={handleLocate}
          disabled={locating}
        >
          {locating ? 'Locating…' : 'Use my location'}
        </button>
      </section>

      <section className="card doctors-map-card">
        <div className="card-head">
          <div>
            <p className="card-label">Nearby care</p>
            <h3>Map of doctors & pharmacies</h3>
          </div>
        </div>
        <div className="doctors-map-shell">
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={13}
            className="doctors-map"
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {userLocation ? (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={roseIcon}>
                <Popup>You are here</Popup>
              </Marker>
            ) : null}
            {places.map((place) => (
              <Marker
                key={place.id}
                position={[place.coords.lat, place.coords.lng]}
                icon={place.type === 'doctor' ? doctorIcon : pharmacyIcon}
              >
                <Popup>
                  <div className="doctors-popup">
                    <strong>{place.name}</strong>
                    <p>{place.specialty}</p>
                    <p>{place.address}</p>
                    <button
                      type="button"
                      className="popup-book-button"
                      onClick={() => handleOpenBooking(place)}
                    >
                      Book Appointment
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        {loadingPlaces ? (
          <p className="status-text">Searching nearby care...</p>
        ) : null}
        {placesError ? (
          <p className="status-text status-text-error">{placesError}</p>
        ) : null}
      </section>

      <section className="page-stack">
        <div className="section-title">
          <p className="eyebrow">In-person care</p>
          <h2>Nearby doctors & pharmacies</h2>
        </div>
        {allResults.length === 0 && !loadingPlaces ? (
          <p className="muted">
            Once your location is on, Veluna will list nearby care options here.
          </p>
        ) : (
          <div className="doctors-grid">
            {allResults.map((place) => (
              <article key={place.id} className="card doctor-card">
                <p className="card-label">{place.type === 'doctor' ? 'Doctor / clinic' : 'Pharmacy'}</p>
                <h3>{place.name}</h3>
                <p className="muted">{place.specialty}</p>
                <p className="muted">{place.address}</p>
                <div className="doctor-meta-row">
                  <span className="doctor-distance">
                    {place.distanceKm.toFixed(1)} km away
                  </span>
                  <span
                    className={`doctor-badge ${
                      place.type === 'doctor' ? 'doctor-badge-gyne' : 'doctor-badge-pharmacy'
                    }`}
                  >
                    {place.specialty}
                  </span>
                </div>
                <div className="doctor-meta-stack">
                  <span className="video-rating">
                    <Star size={14} aria-hidden="true" /> {place.rating.toFixed(1)}/5
                  </span>
                  {place.available ? <span className="video-availability">{place.available}</span> : null}
                  <span className="muted">{place.phone}</span>
                </div>
                <div className="doctor-actions">
                  <button
                    type="button"
                    className="pill-button"
                    onClick={() => handleOpenBooking(place)}
                  >
                    Book appointment
                  </button>
                  {userLocation ? (
                    <a
                      href={`https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${place.coords.lat},${place.coords.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="onboarding-secondary-button doctor-directions-button"
                    >
                      Get directions
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="page-stack">
        <div className="section-title">
          <p className="eyebrow">My care</p>
          <h2>My appointments</h2>
        </div>
        {appointmentsLoading ? (
          <p className="status-text">Loading your appointments...</p>
        ) : null}
        {appointmentsError ? (
          <p className="status-text status-text-error">{appointmentsError}</p>
        ) : null}
        {!appointmentsLoading && appointments.length === 0 && !appointmentsError ? (
          <p className="muted">You don&apos;t have any appointments yet.</p>
        ) : null}
        <div className="doctors-appointments-grid">
          {appointments.map((appt) => (
            <article key={appt.id} className="card appointment-card">
              <p className="card-label">Confirmed appointment</p>
              <h3>{appt.doctor_name}</h3>
              <p className="muted">{appt.doctor_address}</p>
              <div className="appointment-meta">
                <span>
                  {new Date(appt.appointment_date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  · {appt.time_slot}
                </span>
                <span className={`appointment-status appointment-status-${appt.status || 'confirmed'}`}>
                  {appt.status || 'confirmed'}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="page-stack">
        <div className="section-title">
          <p className="eyebrow">Video care</p>
          <h2>Video consultation</h2>
        </div>
        <div className="doctors-grid">
          {VIDEO_DOCTORS.map((doc) => (
            <article key={doc.id} className="card video-doctor-card">
              <div className="video-doctor-head">
                <div>
                  <p className="card-label">Online doctor</p>
                  <h3>{doc.name}</h3>
                  <p className="muted">{doc.specialty}</p>
                </div>
                <span className="video-doctor-avatar" aria-hidden="true">
                  <Video size={18} />
                </span>
              </div>
              <div className="video-doctor-meta">
                <span className="video-availability">{doc.availability}</span>
                <span className="video-rating">
                  <Star size={14} aria-hidden="true" /> {doc.rating.toFixed(1)}/5
                </span>
              </div>
              <button
                type="button"
                className="pill-button"
                onClick={() => setVideoDoctor(doc)}
              >
                <PhoneCall size={16} />
                Start consultation
              </button>
            </article>
          ))}
        </div>
      </section>

      {activeBooking ? (
        <div className="wellness-overlay doctors-booking-overlay" role="dialog" aria-modal="true">
          <div className="wellness-overlay-card doctors-booking-card">
            <p className="card-label overlay-label">Book appointment</p>
            <h2>{activeBooking.name}</h2>
            <p className="muted">{activeBooking.address}</p>

            <div className="doctors-booking-form">
              <label className="field">
                <span>Date</span>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(event) => setAppointmentDate(event.target.value)}
                />
              </label>

              <div className="field">
                <span>Time</span>
                <div className="pill-row booking-slot-row">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`option-pill booking-slot-pill${timeSlot === slot ? ' selected' : ''}`}
                      onClick={() => setTimeSlot(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <label className="field">
                <span>Patient name</span>
                <input
                  type="text"
                  value={patientName}
                  onChange={(event) => setPatientName(event.target.value)}
                  placeholder="Your full name"
                />
              </label>

              <label className="field">
                <span>Reason for visit</span>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="e.g. painful periods, irregular cycles, PCOS follow-up..."
                ></textarea>
              </label>
            </div>

            <div className="wellness-overlay-actions">
              <button
                type="button"
                className="pill-button"
                onClick={handleConfirmBooking}
                disabled={bookingSaving || !appointmentDate || !timeSlot}
              >
                {bookingSaving ? 'Confirming...' : 'Confirm booking'}
              </button>
              <button
                type="button"
                className="onboarding-secondary-button"
                onClick={() => setActiveBooking(null)}
                disabled={bookingSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {videoDoctor ? (
        <div className="video-overlay" role="dialog" aria-modal="true">
          <div className="video-call-shell">
            <header className="video-call-head">
              <div>
                <p className="card-label overlay-label">Video consultation</p>
                <h2>{videoDoctor.name}</h2>
                <p className="muted">{videoDoctor.specialty}</p>
              </div>
              <button
                type="button"
                className="onboarding-secondary-button white-end-button"
                onClick={handleEndCall}
              >
                End call
              </button>
            </header>
            <div className="video-call-grid">
              <div className="video-pane video-pane-self">
                <video ref={videoRef} autoPlay muted playsInline />
              </div>
              <div className="video-pane video-pane-doctor">
                <div className="video-doctor-placeholder">
                  <span>{videoDoctor.name.split(' ')[1] ?? 'Dr'}</span>
                  <p>{videoDoctor.specialty}</p>
                </div>
              </div>
            </div>
            <div className="video-call-controls">
              <button type="button" className="video-control muted">
                Mute
              </button>
              <button type="button" className="video-control">
                Camera
              </button>
              <button type="button" className="video-control video-control-end" onClick={handleEndCall}>
                End
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

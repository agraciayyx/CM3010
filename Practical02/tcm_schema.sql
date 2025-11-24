Table roles {
  id INT [pk, increment]
  name VARCHAR(50) [unique, not null, note: 'e.g., Administrator, Physician, Receptionist']
  description TEXT [null]
}

Table staff {
  id INT [pk, increment]
  name VARCHAR(100) [not null]
  role_id INT [not null, ref: > roles.id]
  license_number VARCHAR(20) [unique, null, note: 'Required only for Physicians']
  username VARCHAR(50) [unique, not null]
  password VARCHAR(100) [not null, note: 'In production: store hashed']
  hire_date DATE [default: `CURRENT_DATE`]
}

Table patients {
  nric VARCHAR(9) [pk, note: 'Singapore NRIC: S8512345A, T0123456G, etc.']
  name VARCHAR(100) [not null]
  gender ENUM('Male', 'Female', 'Other') [not null]
  phone VARCHAR(15) [not null]
  email VARCHAR(100) [unique, null]
  date_of_birth DATE [not null]
  chief_complaint TEXT
}

Table treatment_types {
  id INT [pk, increment]
  name VARCHAR(50) [unique, not null]
  duration_minutes INT [not null, note: '30, 45, 60, or 90']
}

Table rooms {
  id INT [pk, increment]
  room_number VARCHAR(10) [unique, not null]
  room_type VARCHAR(50) [not null]
}

Table appointments {
  id INT [pk, increment]
  patient_nric VARCHAR(9) [not null, ref: > patients.nric]
  physician_staff_id INT [not null, ref: > staff.id, note: 'Must be a staff with role = Physician']
  room_id INT [not null, ref: > rooms.id]
  treatment_type_id INT [not null, ref: > treatment_types.id]
  scheduled_datetime DATETIME [not null]
  status ENUM('scheduled', 'completed', 'cancelled') [default: 'scheduled']
}

//Activity Extension: Modelling Doctor Availability
TABLE physician_availability {
  id INT [pk, increment]
  physician_staff_id INT [not null, ref: > staff.id]
  day_of_week TINYINT [not null, note: '1=Monday, 7=Sunday']
  start_time TIME [not null]
  end_time TIME [not null]

}

-- Create Services Table
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(20) UNIQUE NOT NULL,
    service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    guests INT DEFAULT 1,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert 5 Sample Services (Theme: Tech Cafe & Express Repair Hub)
INSERT INTO services (name, description, price, is_active) VALUES
('Express Laptop Cleaning & Thermal Repaste', 'Deep cleaning of internal fans, heat sinks, and application of premium CPU/GPU thermal paste.', 450.00, true),
('3D Printing Station (1 Hour Session)', 'Access to high-speed 3D printer with 100g PLA filament included and tech staff assist.', 250.00, true),
('Study Desk & Fiber WiFi Lounge (3 Hours)', 'Reserved ergonomic workstation with high-speed fiber connection and complimentary brewed coffee.', 150.00, true),
('OS & Software Troubleshooting', 'Virus removal, operating system reinstallation, driver updates, and software diagnostics.', 350.00, true),
('LAN Gaming Pod Rental (2 Hours)', 'High-spec PC setup with mechanical peripherals and pre-installed esports games for team play.', 200.00, true);
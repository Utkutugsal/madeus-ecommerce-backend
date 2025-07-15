const express = require('express');
const router = express.Router();
const { Database } = require('../config/database');
const authenticateToken = require('../middleware/auth');

const db = new Database();

// Get user addresses
router.get('/addresses', authenticateToken, async (req, res) => {
    try {
        const addresses = await db.query(
            'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
            [req.user.userId]
        );

        res.json(addresses || []);

    } catch (error) {
        console.error('Get addresses error:', error);
        res.status(500).json({ error: 'Failed to get addresses' });
    }
});

// Add address
router.post('/addresses', authenticateToken, async (req, res) => {
    try {
        console.log('📍 Add address request received (users route)');
        console.log('📍 User ID:', req.user.userId);
        console.log('📍 Request body:', req.body);
        
        const { title, first_name, last_name, address_line_1, address_line_2, city, district, postal_code, phone, is_default } = req.body;
        
        console.log('📍 Extracted data:', {
            title, first_name, last_name, address_line_1, address_line_2, 
            city, district, postal_code, phone, is_default
        });
        
        // If this is default address, make others non-default
        if (is_default) {
            console.log('📍 Making other addresses non-default');
            await db.query(
                'UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?',
                [req.user.userId]
            );
        }

        // Insert new address with direct SQL
        const sql = `
            INSERT INTO user_addresses 
            (user_id, title, first_name, last_name, address_line_1, address_line_2, city, district, postal_code, phone, is_default) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            req.user.userId,
            title,
            first_name,
            last_name,
            address_line_1,
            address_line_2 || null,
            city,
            district,
            postal_code,
            phone,
            is_default ? 1 : 0
        ];
        
        console.log('📍 SQL:', sql);
        console.log('📍 Params:', params);

        const result = await db.query(sql, params);
        
        console.log('📍 Insert result:', result);

        res.json({ 
            message: 'Address added successfully',
            addressId: result.insertId 
        });

    } catch (error) {
        console.error('❌ Add address error:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to add address' });
    }
});

// Update address
router.put('/addresses/:id', authenticateToken, async (req, res) => {
    try {
        const addressId = parseInt(req.params.id);
        const { title, first_name, last_name, address_line_1, address_line_2, city, district, postal_code, phone, is_default } = req.body;
        
        // If this is default address, make others non-default
        if (is_default) {
            await db.query(
                'UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?',
                [req.user.userId]
            );
        }

        const sql = `
            UPDATE user_addresses 
            SET title = ?, first_name = ?, last_name = ?, address_line_1 = ?, address_line_2 = ?, 
                city = ?, district = ?, postal_code = ?, phone = ?, is_default = ?
            WHERE id = ? AND user_id = ?
        `;
        
        const params = [
            title, first_name, last_name, address_line_1, address_line_2 || null,
            city, district, postal_code, phone, is_default ? 1 : 0,
            addressId, req.user.userId
        ];

        await db.query(sql, params);

        res.json({ message: 'Address updated successfully' });

    } catch (error) {
        console.error('Update address error:', error);
        res.status(500).json({ error: 'Failed to update address' });
    }
});

// Delete address
router.delete('/addresses/:id', authenticateToken, async (req, res) => {
    try {
        const addressId = parseInt(req.params.id);
        
        await db.query(
            'DELETE FROM user_addresses WHERE id = ? AND user_id = ?',
            [addressId, req.user.userId]
        );

        res.json({ message: 'Address deleted successfully' });

    } catch (error) {
        console.error('Delete address error:', error);
        res.status(500).json({ error: 'Failed to delete address' });
    }
});

module.exports = router; 
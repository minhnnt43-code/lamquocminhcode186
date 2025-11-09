// Cổng này dùng để lấy danh sách công việc
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data, error } = await supabase
            .from('tasks') // Lấy từ tủ 'tasks'
            .select('*')   // Lấy tất cả các ngăn
            .order('created_at', { ascending: false }); // Sắp xếp theo cái mới nhất lên trên

        if (error) {
            throw error;
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        return { statusCode: 500, body: error.toString() };
    }
};

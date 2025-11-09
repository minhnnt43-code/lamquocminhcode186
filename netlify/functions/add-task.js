// Cổng này dùng để thêm công việc mới
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Lấy tên công việc từ dữ liệu được gửi lên
        const { name } = JSON.parse(event.body);

        const { data, error } = await supabase
            .from('tasks') // Thêm vào tủ 'tasks'
            .insert([{ name: name, is_completed: false }]) // Cắm một dòng mới
            .select();

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
